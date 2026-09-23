import { prisma } from "@/lib/prisma";

export interface PromoApplication {
  promoCodeId: string;
  discountAmount: number;
}

/** Validates a promo code against one seller's sub-order and computes the discount, or returns null if it doesn't apply. */
export async function tryApplyPromoCode(code: string, sellerId: string, subtotal: number, userId: string): Promise<PromoApplication | null> {
  const promo = await prisma.promoCode.findUnique({ where: { sellerId_code: { sellerId, code: code.trim().toUpperCase() } } });
  if (!promo || !promo.active) return null;
  if (promo.expiresAt && promo.expiresAt < new Date()) return null;
  if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) return null;
  if (promo.minSubtotal !== null && subtotal < promo.minSubtotal) return null;

  const userRedemptions = await prisma.promoRedemption.count({ where: { promoCodeId: promo.id, userId } });
  if (userRedemptions >= promo.perUserLimit) return null;

  const discountAmount = promo.discountType === "PERCENT"
    ? Math.round(subtotal * (promo.discountValue / 100))
    : Math.min(promo.discountValue, subtotal);

  return { promoCodeId: promo.id, discountAmount };
}

export async function recordPromoRedemption(promoCodeId: string, userId: string, orderId: string, discountAmount: number) {
  await prisma.$transaction([
    prisma.promoRedemption.create({ data: { promoCodeId, userId, orderId, discountAmount } }),
    prisma.promoCode.update({ where: { id: promoCodeId }, data: { redemptionCount: { increment: 1 } } }),
  ]);
}

/** Undoes recordPromoRedemption — called when an order that redeemed a promo
 * code is cancelled or refunded, so the redemption doesn't permanently count
 * against the code's maxRedemptions/perUserLimit for a discount the buyer
 * never actually got. A no-op if this order never redeemed one. */
export async function reversePromoRedemption(orderId: string) {
  const redemption = await prisma.promoRedemption.findUnique({ where: { orderId } });
  if (!redemption) return;
  await prisma.$transaction([
    prisma.promoRedemption.delete({ where: { id: redemption.id } }),
    prisma.promoCode.update({ where: { id: redemption.promoCodeId }, data: { redemptionCount: { decrement: 1 } } }),
  ]);
}
