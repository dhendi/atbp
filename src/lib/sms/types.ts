export interface SendSmsResult {
  success: boolean;
  error?: string;
}

/** Mirrors ShippingProvider (see lib/shipping/types.ts) — same provider-per-
 * adapter, registry-picks-the-active-one shape, just for outbound SMS. */
export interface SmsProvider {
  id: string;
  sendSms(to: string, body: string): Promise<SendSmsResult>;
}
