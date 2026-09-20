"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/services/email";
import { checkRateLimit } from "@/lib/services/rate-limit";

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
