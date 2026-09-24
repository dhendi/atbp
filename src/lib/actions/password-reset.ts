"use server";

import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/services/email";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { revokeSessions } from "@/lib/services/sessions";

const TOKEN_TTL_MS = 60 * 60_000; // 1 hour

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordResetAction(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { error: "Enter your email address." };

  // Keyed by the submitted email rather than a session — this form is used by
  // logged-out visitors, so there's no user id to rate-limit against yet.
  if (!(await checkRateLimit(`password-reset:${normalizedEmail}`, 5, 15 * 60_000))) {
    return { error: "Too many requests. Please wait a while before trying again." };
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  // Always return the same generic response whether or not the email exists,
  // so this form can't be used to enumerate registered accounts.
  const genericResult = { success: true as const, message: "If that email has an ATBP account, we've sent a reset link." };
  if (!user) return genericResult;

  const token = randomBytes(32).toString("hex");
  // Only the hash is stored, so a database read, backup, or log leak can't be
  // turned into working reset links. The raw token exists only in the email.
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token: hashResetToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return genericResult;
}

export async function resetPasswordAction(token: string, newPassword: string) {
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters." };

  if (newPassword.length > 128) return { error: "Password is too long." };

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: hashResetToken(String(token)) } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  // Redeem atomically: the `usedAt: null` condition in the WHERE clause is
  // what stops two concurrent requests from both passing the check above and
  // both resetting the password with the same link.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: resetToken.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
  // A password reset is also a good moment to kill any session that might
  // belong to whoever had the old (possibly compromised) password.
  await revokeSessions(resetToken.userId);

  return { success: true };
}
