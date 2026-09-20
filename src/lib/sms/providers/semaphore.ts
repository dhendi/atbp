import type { SmsProvider } from "../types";

/**
 * ============================================================================
 * SEMAPHORE ADAPTER — INACTIVE UNTIL CREDENTIALS EXIST. READ BEFORE ACTIVATING.
 * ============================================================================
 *
 * Semaphore (semaphore.co) is a Philippine SMS gateway — a reasonable default
 * choice for PH mobile OTP given how this app already leans PH-specific
 * (see lib/local-shared.ts). This is NOT reachable from anywhere in the app
 * until SMS_PROVIDER="SEMAPHORE" AND SEMAPHORE_API_KEY are both set — see
 * isActive() in ../registry.ts. Nothing here has been tested against a real
 * Semaphore account, because there isn't one yet.
 *
 * To activate:
 * 1. Sign up at https://semaphore.co, buy SMS credits, and get your API key
 *    from the dashboard.
 * 2. Set SEMAPHORE_API_KEY (required) and optionally SEMAPHORE_SENDER_NAME
 *    (a registered sender name — Semaphore requires this to be approved by
 *    them first, otherwise omit it and it falls back to their shared default).
 * 3. Set SMS_PROVIDER="SEMAPHORE".
 * 4. VERIFY the endpoint/payload/response shape below against Semaphore's
 *    current API docs (https://semaphore.co/docs) before relying on it —
 *    this is a best-effort implementation of their documented v4 Send
 *    Message endpoint, not verified against a live account.
 * ============================================================================
 */

const SEND_URL = "https://api.semaphore.co/api/v4/messages"; // ⚠️ VERIFY against live docs

export const semaphoreProvider: SmsProvider = {
  id: "SEMAPHORE",

  async sendSms(to, body) {
    try {
      const params = new URLSearchParams({
        apikey: process.env.SEMAPHORE_API_KEY ?? "",
        number: to,
        message: body,
      });
      if (process.env.SEMAPHORE_SENDER_NAME) params.set("sendername", process.env.SEMAPHORE_SENDER_NAME);

      const res = await fetch(SEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      if (!res.ok) return { success: false, error: `Semaphore send failed: ${res.status} ${await res.text()}` };
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Semaphore request failed." };
    }
  },
};
