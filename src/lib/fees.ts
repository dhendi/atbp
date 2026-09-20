import type { PaymentMethodId } from "@/lib/payments/provider";

// ---------- Buyer Protection Fee ----------
// Charged to the buyer at checkout on prepaid orders only — COD has nothing
// to protect against (the buyer inspects the item before paying, in person),
// so it's exempt. Pure/no-deps so both the server (order creation) and the
// checkout client component can compute the same number for display vs. what
// actually gets charged.
const BUYER_PROTECTION_EXEMPT_METHODS: ReadonlySet<PaymentMethodId> = new Set(["COD"]);

export const BUYER_PROTECTION_RATE = 0.03; // 3% of item subtotal
export const BUYER_PROTECTION_BASE = 10; // + ₱10 base
export const BUYER_PROTECTION_CAP = 150; // capped per order

// Buyer Protection defaults unchecked — the buyer opts in deliberately
// rather than having to notice and uncheck it. The free RA 11967 redress
// path (filing a dispute) is never gated on this; only the platform-backed
// refund *guarantee* is. Flip this to change the default without touching
// every checkout surface that reads it.
export const BUYER_PROTECTION_DEFAULT_ON = false;

export function buyerProtectionFeeFor(subtotal: number, paymentMethod: PaymentMethodId, optedIn: boolean = true): number {
  if (!optedIn || BUYER_PROTECTION_EXEMPT_METHODS.has(paymentMethod)) return 0;
  const raw = Math.min(subtotal * BUYER_PROTECTION_RATE + BUYER_PROTECTION_BASE, BUYER_PROTECTION_CAP);
  return Math.round(raw * 100) / 100;
}

// ---------- Instant Payout Fee ----------
// Flat fee regardless of withdrawal amount — see lib/actions/payouts.ts.
export const INSTANT_PAYOUT_FEE = 99;
