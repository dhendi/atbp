import { prisma } from "@/lib/prisma";
import type { Coupon } from "@prisma/client";

export const FIRST_PURCHASE_CAMPAIGN_CODE = "FIRST_PURCHASE";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids ambiguous codes

function generateCouponCode(prefix: string) {
  let suffix = "";
  for (let i = 0; i < 8; i++) suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${prefix}-${suffix}`;
}

async function hasCompletedPurchase(userId: string): Promise<boolean> {
  const count = await prisma.order.count({
    where: { buyerId: userId, status: { notIn: ["PAYMENT_PENDING", "CANCELLED"] } },
  });
  return count > 0;
}

export type FirstPurchasePromoStatus =
  | "anonymous" // no session — send to signup
  | "logged_in_unsubscribed" // eligible, hasn't claimed yet
  | "claimed_active" // has an unused coupon
  | "claimed_used" // already spent it
  | "ineligible"; // already has order history predating this promo

export interface FirstPurchasePromoState {
  status: FirstPurchasePromoStatus;
  couponCode?: string;
}

/** Read-only eligibility check — drives whether the popup/badge render at all. */
export async function getFirstPurchasePromoState(userId: string | null): Promise<FirstPurchasePromoState> {
  if (!userId) return { status: "anonymous" };

  const campaign = await prisma.couponCampaign.findUnique({ where: { code: FIRST_PURCHASE_CAMPAIGN_CODE } });
  if (!campaign || !campaign.active) return { status: "ineligible" };

  const coupon = await prisma.coupon.findFirst({ where: { userId, campaignId: campaign.id } });
  if (coupon) {
    return { status: coupon.status === "USED" ? "claimed_used" : "claimed_active", couponCode: coupon.code };
  }

  const purchased = await hasCompletedPurchase(userId);
  if (purchased) return { status: "ineligible" };

  return { status: "logged_in_unsubscribed" };
}

export type ClaimResult = { error: string } | { success: true; coupon: Coupon };

/**
 * Idempotent: a user who already claimed (active or used) just gets that
 * same coupon back rather than a second one — this is what "do not allow
 * another claim" and "show their existing coupon instead" resolve to.
 * Assumes the caller has already set `user.marketingOptIn = true`.
 */
export async function claimFirstPurchaseCoupon(userId: string): Promise<ClaimResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Please log in first." };
  if (!user.marketingOptIn) return { error: "Join the mailing list to claim this offer." };

  const campaign = await prisma.couponCampaign.findUnique({ where: { code: FIRST_PURCHASE_CAMPAIGN_CODE } });
  if (!campaign || !campaign.active) return { error: "This promotion isn't available right now." };

  const existing = await prisma.coupon.findFirst({ where: { userId, campaignId: campaign.id } });
  if (existing) return { success: true, coupon: existing };

  if (await hasCompletedPurchase(userId)) {
    return { error: "This offer is for first-time customers only." };
  }

  let code = generateCouponCode("WELCOME");
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.coupon.findUnique({ where: { code } });
    if (!clash) break;
    code = generateCouponCode("WELCOME");
  }

  const coupon = await prisma.coupon.create({
    data: {
      campaignId: campaign.id,
      userId,
      code,
      discountType: campaign.discountType,
      discountValue: campaign.discountValue,
      maxDiscount: campaign.maxDiscount,
      minSubtotal: campaign.minSubtotal,
      status: "ACTIVE",
    },
  });
  return { success: true, coupon };
}

export interface CouponPreview {
  couponId: string;
  code: string;
  discountAmount: number;
}

/** Read-only — finds the buyer's own best usable coupon for this cart, without spending it. */
export async function previewCoupon(userId: string, cartSubtotal: number): Promise<CouponPreview | null> {
  const coupon = await prisma.coupon.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { claimedAt: "asc" },
  });
  if (!coupon) return null;
  if (coupon.minSubtotal !== null && cartSubtotal < coupon.minSubtotal) return null;

  const raw = coupon.discountType === "PERCENT" ? cartSubtotal * (coupon.discountValue / 100) : coupon.discountValue;
  const capped = coupon.maxDiscount !== null ? Math.min(raw, coupon.maxDiscount) : raw;
  const discountAmount = Math.min(Math.round(capped * 100) / 100, cartSubtotal);
  if (discountAmount <= 0) return null;

  return { couponId: coupon.id, code: coupon.code, discountAmount };
}

/** Records that this order redeemed the coupon — mirrors recordPromoRedemption. */
export async function recordCouponRedemption(couponId: string, userId: string, orderId: string, discountAmount: number) {
  await prisma.couponRedemption.create({ data: { couponId, userId, orderId, discountAmount } });
}

/**
 * Atomically flips ACTIVE -> USED. Called once, after every split order from
 * a checkout has been created, so a double-submit (two tabs, a retried
 * request) can't spend the same coupon twice — the guard is the WHERE
 * clause, not a prior read.
 */
export async function finalizeCouponUsage(couponId: string) {
  await prisma.coupon.updateMany({ where: { id: couponId, status: "ACTIVE" }, data: { status: "USED", usedAt: new Date() } });
}
