import type { SmsProvider } from "./types";
import { mockSmsProvider } from "./providers/mock";
import { semaphoreProvider } from "./providers/semaphore";

const allProviders: SmsProvider[] = [semaphoreProvider];

/** Mirrors lib/shipping/registry.ts's isActive() — a provider is gated behind
 * its own env vars, and activating one later means setting env vars, not
 * changing code. Add a new SMS gateway (e.g. Firebase Phone Auth) by adding
 * it to allProviders above and a case here. */
function isActive(id: string): boolean {
  if (id === "SEMAPHORE") return process.env.SMS_PROVIDER === "SEMAPHORE" && !!process.env.SEMAPHORE_API_KEY;
  return false;
}

/** The provider that actually sends the OTP SMS — falls back to the always-
 * active mock (console-logs the message) until a real provider is
 * configured, same fallback shape as MANUAL in the shipping registry. */
export function getSmsProvider(): SmsProvider {
  return allProviders.find((p) => isActive(p.id)) ?? mockSmsProvider;
}
