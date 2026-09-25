"use server";

import { isBlockedRole } from "@/lib/auth-roles";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSecret, verifyTotp, otpauthUri, generateRecoveryCodes } from "@/lib/services/totp";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { logAdminAction } from "@/lib/services/audit-log";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function getTwoFactorStatusAction() {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const record = await prisma.twoFactorAuth.findUnique({ where: { userId: admin.id } });
  return { success: true as const, enabled: !!record?.verifiedAt };
}

/** Starts (or restarts) enrollment — generates a fresh secret that isn't
 * active until confirmed with a real code from the authenticator app. */
export async function beginTwoFactorSetupAction() {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  // Re-running enrollment overwrites the secret and clears verifiedAt, which
  // would let a stolen session silently swap in an attacker's authenticator.
  // An already-enabled account has to disable 2FA (which needs a live code)
  // before it can enroll a new device.
  const existing = await prisma.twoFactorAuth.findUnique({ where: { userId: admin.id } });
  if (existing?.verifiedAt) return { error: "Two-factor authentication is already on. Disable it first to set up a new device." };

  const secret = generateSecret();
  await prisma.twoFactorAuth.upsert({
    where: { userId: admin.id },
    update: { secret, verifiedAt: null, recoveryCodes: [] },
    create: { userId: admin.id, secret },
  });

  return { success: true as const, secret, otpauthUri: otpauthUri(secret, admin.email ?? admin.username) };
}

export async function confirmTwoFactorSetupAction(code: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const record = await prisma.twoFactorAuth.findUnique({ where: { userId: admin.id } });
  if (!record) return { error: "Start setup first." };
  if (!verifyTotp(record.secret, code)) return { error: "That code didn't match. Check the time on your device and try again." };

  const recoveryCodes = generateRecoveryCodes();
  const hashed = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, 10)));
  await prisma.twoFactorAuth.update({
    where: { userId: admin.id },
    data: { verifiedAt: new Date(), recoveryCodes: hashed },
  });
  // Previously the one admin action type with no audit trail at all — an
  // admin's own 2FA enroll/disable is exactly the kind of account-security
  // event the audit log exists for.
  await logAdminAction(admin.id, "ENABLE_2FA", "User", admin.id);

  // Recovery codes are only ever shown this once — only the bcrypt hashes are kept.
  return { success: true as const, recoveryCodes };
}

export async function disableTwoFactorAction(code: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  // Turning 2FA off needs a live code (authenticator or a recovery code), not
  // just a logged-in session, so a stolen session cookie can't strip it.
  if (!(await checkRateLimit(`2fa-disable:${admin.id}`, 5, 15 * 60_000))) {
    return { error: "Too many attempts. Please wait a while before trying again." };
  }
  const record = await prisma.twoFactorAuth.findUnique({ where: { userId: admin.id } });
  if (record?.verifiedAt) {
    const trimmed = String(code ?? "").trim();
    let ok = !!trimmed && verifyTotp(record.secret, trimmed);
    if (!ok && trimmed) {
      for (const hash of record.recoveryCodes as string[]) {
        if (await bcrypt.compare(trimmed, hash)) { ok = true; break; }
      }
    }
    if (!ok) return { error: "That code didn't work." };
  }
  await prisma.twoFactorAuth.deleteMany({ where: { userId: admin.id } });
  await logAdminAction(admin.id, "DISABLE_2FA", "User", admin.id);
  return { success: true };
}

/**
 * Called before the real sign-in attempt: verifies the password without
 * creating a session, so the login form knows whether to ask for a 2FA code
 * next. Keeps two-factor entirely out of NextAuth's Credentials error
 * handling, which doesn't distinguish error causes well.
 */
export async function checkPasswordAction(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return { error: "Enter your email and password." };

  if (!(await checkRateLimit(`login-check:${normalizedEmail}`, 10, 15 * 60_000))) {
    return { error: "Too many attempts. Please wait a while before trying again." };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { twoFactorAuth: true },
  });
  if (!user || isBlockedRole(user.role)) return { error: "Invalid email or password." };
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { error: "Invalid email or password." };

  return { success: true as const, requires2FA: !!user.twoFactorAuth?.verifiedAt };
}
