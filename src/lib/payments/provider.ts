export type PaymentMethodId = "GCASH" | "MAYA" | "QR_PH" | "CARD" | "ONLINE_BANKING" | "COD" | "MOCK";

export interface PaymentIntentResult {
  success: boolean;
  providerRef: string;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
}

export interface PaymentProvider {
  id: PaymentMethodId;
  label: string;
  createAndConfirm(amount: number, orderId: string): Promise<PaymentIntentResult>;
}

/**
 * All payment methods currently resolve through this mock provider so checkout is
 * fully functional end-to-end. Swapping in a real GCash/Maya/card processor later
 * only requires implementing PaymentProvider and registering it below — nothing in
 * the checkout flow or order creation logic needs to change.
 */
class MockPaymentProvider implements PaymentProvider {
  constructor(public id: PaymentMethodId, public label: string) {}

  async createAndConfirm(amount: number, orderId: string): Promise<PaymentIntentResult> {
    void amount;
    // COD defers payment collection to delivery; everything else "succeeds" instantly in this mock.
    if (this.id === "COD") {
      return { success: true, providerRef: `cod_${orderId}`, status: "PENDING" };
    }
    return { success: true, providerRef: `mock_${this.id.toLowerCase()}_${orderId}_${Date.now()}`, status: "SUCCEEDED" };
  }
}

const providers: Record<PaymentMethodId, PaymentProvider> = {
  GCASH: new MockPaymentProvider("GCASH", "GCash"),
  MAYA: new MockPaymentProvider("MAYA", "Maya"),
  QR_PH: new MockPaymentProvider("QR_PH", "QR Ph"),
  CARD: new MockPaymentProvider("CARD", "Credit / Debit Card"),
  ONLINE_BANKING: new MockPaymentProvider("ONLINE_BANKING", "Online Banking"),
  COD: new MockPaymentProvider("COD", "Cash on Delivery"),
  MOCK: new MockPaymentProvider("MOCK", "Test Payment"),
};

export function getPaymentProvider(id: PaymentMethodId): PaymentProvider {
  return providers[id] ?? providers.MOCK;
}

/** True only for the methods a buyer can actually pick at checkout. Server
 * actions must check the client-supplied method with this: getPaymentProvider
 * silently falls back to the always-succeeds MOCK provider for anything it
 * doesn't recognize, so an unchecked string ("mock", "cod" in another case,
 * garbage) would mark an order paid, or slip past the exact-match COD guards. */
export function isClientPaymentMethod(value: unknown): value is PaymentMethodId {
  return typeof value === "string" && AVAILABLE_PAYMENT_METHODS.some((m) => m.id === value);
}

// A ₱15 flat processing fee applies to Card and Online Banking orders (see
// lib/services/commission.ts) — surfaced here too so checkout can be upfront
// about it before the buyer picks a method.
export const AVAILABLE_PAYMENT_METHODS: { id: PaymentMethodId; label: string; description: string }[] = [
  { id: "GCASH", label: "GCash", description: "Pay instantly using your GCash wallet." },
  { id: "MAYA", label: "Maya", description: "Pay instantly using your Maya wallet." },
  { id: "QR_PH", label: "QR Ph", description: "Scan to pay from any participating bank or wallet." },
  { id: "CARD", label: "Credit / Debit Card", description: "Visa, Mastercard, and JCB accepted." },
  { id: "ONLINE_BANKING", label: "Online Banking", description: "Pay directly from your bank account." },
  { id: "COD", label: "Cash on Delivery", description: "Pay in cash when your order arrives." },
];
