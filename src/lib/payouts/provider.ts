export type PayoutMethodId = "GCASH" | "MAYA" | "BANK";

export interface PayoutResult {
  success: boolean;
  providerRef: string;
}

export interface PayoutProvider {
  id: PayoutMethodId;
  label: string;
  disburse(amount: number, destination: string): Promise<PayoutResult>;
}

/**
 * Mock disbursement — approves every payout instantly so seller withdrawals are
 * functional in the demo. A production integration (Xendit, PayMongo, etc.) can
 * implement PayoutProvider and be swapped in without touching the wallet UI.
 *
 * IMPORTANT: this is also what backs the "Instant Payout" option (₱99 fee,
 * see lib/fees.ts and lib/actions/payouts.ts) for now. No real payout
 * provider is connected yet, so there's no actual instant-disbursement
 * capability being exercised here — standard and instant payouts both just
 * succeed immediately in this mock, same as every other payout. Before
 * charging real users the ₱99 fee, confirm your actual connected provider
 * (Xendit/PayMongo) supports genuine on-demand/instant disbursement — if it
 * doesn't, the fee needs to either come off, or the "instant" promise needs
 * to change to whatever that provider can really deliver.
 */
class MockPayoutProvider implements PayoutProvider {
  constructor(public id: PayoutMethodId, public label: string) {}

  async disburse(amount: number, destination: string): Promise<PayoutResult> {
    void amount;
    void destination;
    return { success: true, providerRef: `payout_${this.id.toLowerCase()}_${Date.now()}` };
  }
}

const providers: Record<PayoutMethodId, PayoutProvider> = {
  GCASH: new MockPayoutProvider("GCASH", "GCash"),
  MAYA: new MockPayoutProvider("MAYA", "Maya"),
  BANK: new MockPayoutProvider("BANK", "Bank Transfer"),
};

export function getPayoutProvider(id: PayoutMethodId): PayoutProvider {
  return providers[id] ?? providers.BANK;
}
