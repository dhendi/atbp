"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { normalizePhMobile } from "@/lib/phone";
import { sendPhoneOtpSms } from "@/lib/services/sms";
import { checkRateLimit } from "@/lib/services/rate-limit";

const OTP_TTL_MS = 5 * 60_000; // 5 minutes

/** Requests an OTP for phone login/register — unified, like WhatsApp/Telegram
 * phone auth: whether `phone` already belongs to an account or not, the same
 * code is sent, and the NextAuth "phone-otp" Credentials provider (see
 * lib/auth.ts) decides at verify time whether that's a login or a new
 * account. Never reveals which case it is here, same anti-enumeration
 * principle as requestPasswordResetAction's generic response. */
export async function requestPhoneOtpAction(rawPhone: string) {
  const phone = normalizePhMobile(rawPhone);
  if (!phone) return { error: "Enter a valid PH mobile number, e.g. 0917 123 4567." };

  // Every code sent is a paid text, and the per-number limit below does nothing
  // against someone cycling through many different numbers. Cap per visitor too.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`phone-otp-send-ip:${ip}`, 10, 60 * 60_000))) {
    return { error: "Too many attempts. Please wait a while before trying again." };
  }

  if (!(await checkRateLimit(`phone-otp-send:${phone}`, 5, 15 * 60_000))) {
    return { error: "Too many attempts. Please wait a while before trying again." };
  }

  const code = String(randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.phoneOtpToken.create({
    data: { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  const smsResult = await sendPhoneOtpSms(phone, code);

  return {
    success: true as const,
    phone,
    // Dev-only convenience for testing the flow without a real SMS provider
    // configured. The NODE_ENV check is deliberate and load-bearing, not
    // redundant with smsResult.previewText: previewText only reflects which
    // *provider* is active, and SMS_PROVIDER/SEMAPHORE_API_KEY being unset in
    // a live deployment (misconfiguration, not a dev environment) would
    // otherwise still hand this account's OTP back to whoever called this
    // action — a full phone-login bypass. NODE_ENV=production is the one
    // signal that can't be forgotten the same way an SMS env var can.
    devCode: process.env.NODE_ENV !== "production" && smsResult.previewText ? code : undefined,
  };
}
