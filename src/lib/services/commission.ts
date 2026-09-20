import { prisma } from "@/lib/prisma";
import { getEffectiveLimits } from "@/lib/services/seller-plan";
import type { PaymentMethodId } from "@/lib/payments/provider";

// ---------- ATBP fee structure — source of truth ----------
// Commission rate itself lives on SellerPlan (10% Free/Pro, 8% Premium) and is
// read through getEffectiveLimits so it can never drift from what's seeded/
// configured there. The ₱15 processing fee has no such row — it's a flat,
// payment-method-driven business rule, not a per-plan one, so it's a constant
// here rather than duplicated across every call site.
export const CARD_PROCESSING_FEE = 15; // flat pesos, not a percentage
// COD added once Ninja Van (or another COD-capable courier) is active — this
// is how ATBP recoups the cost of Ninja Van's own ~2.75% COD handling fee
// (see NINJAVAN_COD_HANDLING_RATE in lib/shipping/providers/ninjavan.ts),
// which is platform-absorbed rather than deducted from the seller directly.
const PROCESSING_FEE_METHODS: ReadonlySet<PaymentMethodId> = new Set(["CARD", "ONLINE_BANKING", "COD"]);

export function processingFeeFor(paymentMethod: PaymentMethodId): number {
  return PROCESSING_FEE_METHODS.has(paymentMethod) ? CARD_PROCESSING_FEE : 0;
}

export interface CommissionBreakdown {
  planCode: string;
  ratePercent: number;
  subtotal: number;
  commissionAmount: number;
  processingFee: number;
  sellerProceeds: number;
}

/** Centralized commission math — every place that needs to know "what does ATBP take" calls this, never inlines the percentage or the ₱15 fee. */
export async function calculateCommission(sellerId: string, subtotal: number, paymentMethod: PaymentMethodId): Promise<CommissionBreakdown> {
  const limits = await getEffectiveLimits(sellerId);
  const ratePercent = limits.transactionFeePercent;
  const commissionAmount = Math.round(subtotal * (ratePercent / 100) * 100) / 100;
  const processingFee = processingFeeFor(paymentMethod);
  const sellerProceeds = Math.round((subtotal - commissionAmount - processingFee) * 100) / 100;
  return { planCode: limits.planCode, ratePercent, subtotal, commissionAmount, processingFee, sellerProceeds };
}

/** Writes the locked-in commission row for a completed order. Called once, at order creation — the rate baked into this row never changes even if SellerPlan.transactionFeePercent changes later. */
export async function recordCommission(orderId: string, sellerId: string, subtotal: number, paymentMethod: PaymentMethodId) {
  const breakdown = await calculateCommission(sellerId, subtotal, paymentMethod);
  return prisma.commission.create({
    data: {
      orderId,
      sellerId,
      planCodeAtSale: breakdown.planCode,
      ratePercent: breakdown.ratePercent,
      subtotal: breakdown.subtotal,
      commissionAmount: breakdown.commissionAmount,
      processingFee: breakdown.processingFee,
      sellerProceeds: breakdown.sellerProceeds,
    },
  });
}
