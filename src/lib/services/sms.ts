import { getSmsProvider } from "@/lib/sms/registry";

/**
 * No real SMS provider is wired up yet, so this "sends" via the mock provider
 * (console-logs and returns success) until SMS_PROVIDER + credentials are set
 * — see lib/sms/registry.ts. Mirrors lib/services/email.ts's mock-until-
 * configured pattern exactly.
 *
 * To go live: set SMS_PROVIDER="SEMAPHORE" and SEMAPHORE_API_KEY (see the
 * activation comment in lib/sms/providers/semaphore.ts) — nothing else in
 * the phone-OTP flow needs to change.
 */
export interface SendSmsResult {
  sent: boolean;
  previewText?: string;
}

export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const provider = getSmsProvider();
  const result = await provider.sendSms(to, body);
  if (!result.success) return { sent: false, previewText: result.error };
  // The mock provider never actually reaches a phone — surface the body so a
  // caller (see requestPhoneOtpAction) can hand it back for local testing,
  // same trick sendPasswordResetEmail's caller uses for devResetUrl.
  return { sent: true, previewText: provider.id === "MOCK" ? body : undefined };
}

export async function sendPhoneOtpSms(to: string, code: string): Promise<SendSmsResult> {
  return sendSms(to, `Your ATBP verification code is ${code}. It expires in 5 minutes. Don't share this code with anyone.`);
}
