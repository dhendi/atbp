import type { SmsProvider } from "../types";

/** Always active — logs the message instead of sending a real SMS. This is
 * what's live until SMS_PROVIDER is set to a real provider's id and its
 * credentials are filled in (see providers/semaphore.ts for what's needed
 * to activate that one). */
export const mockSmsProvider: SmsProvider = {
  id: "MOCK",

  async sendSms(to, body) {
    // The message body carries the actual OTP code — only worth printing in
    // a dev environment. In production this being reached at all means
    // SMS_PROVIDER/SEMAPHORE_API_KEY are missing, which is itself the thing
    // worth logging loudly, not the code.
    if (process.env.NODE_ENV !== "production") console.log(`[mock sms] to=${to}\n${body}`);
    else console.error(`[mock sms] SMS_PROVIDER not configured — OTP to ${to} was not actually sent.`);
    return { success: true };
  },
};
