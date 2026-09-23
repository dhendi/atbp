"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/services/email";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { isPlaceholderEmail } from "@/lib/phone";

const OTP_TTL_MS = 5 * 60_000; // 5 minutes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Requests an OTP for email login/register — same unified shape as
 * requestPhoneOtpAction: whether `email` already belongs to an account or
 * not, the same code is sent, and the NextAuth "email-otp" Credentials
 * provider (see lib/auth.ts) decides at verify time whether that's a login
 * or a new account. Unlike phone OTP, ZeptoMail is a real, working provider
 * — no dev-mode code fallback here. */
export async function requestEmailOtpAction(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  if (!(await checkRateLimit(`email-otp-send:${email}`, 5, 15 * 60_000))) {
    return { error: "Too many attempts. Please wait a while before trying again." };
  }

  const code = String(randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.emailOtpToken.create({
    data: { email, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  await sendEmail(
    email,
    "Your ATBP login code",
    `Your ATBP verification code is ${code}. It expires in 5 minutes. Don't share this code with anyone.`
  );

  return { success: true as const, email };
}

/** Sends a verification code to the *currently signed-in* user's own email —
 * for the "verify your email" banner (see EmailVerificationBanner), not for
 * logging in. Reuses the exact same EmailOtpToken mechanism as
 * requestEmailOtpAction, just scoped to the session's own address rather
 * than an arbitrary typed-in one. */
export async function requestVerificationEmailAction() {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (isPlaceholderEmail(session.user.email!)) return { error: "This account doesn't have a real email to verify." };

  return requestEmailOtpAction(session.user.email!);
}

/** Verifies a code sent via requestVerificationEmailAction against the
 * signed-in user's own email and marks it verified — a dedicated action
 * rather than reusing the "email-otp" sign-in provider, since this is
 * confirming an already-authenticated session's address, not establishing a
 * new one. */
export async function confirmVerificationCodeAction(code: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  const email = session.user.email!;

  if (!(await checkRateLimit(`email-otp-verify:${email}`, 10, 15 * 60_000))) {
    return { error: "Too many attempts. Please wait a while and try again." };
  }

  const token = await prisma.emailOtpToken.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token || token.attempts >= 5) return { error: "That code didn't work. Request a new one." };

  const valid = await bcrypt.compare(code.trim(), token.codeHash);
  if (!valid) {
    await prisma.emailOtpToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
    return { error: "That code didn't work." };
  }
  await prisma.emailOtpToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
  await prisma.user.update({ where: { id: session.user.id }, data: { emailVerifiedAt: new Date() } });

  return { success: true as const };
}
