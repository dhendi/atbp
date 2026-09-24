"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveLimits, getSellerUsage } from "@/lib/services/seller-plan";
import { getPaymentProvider } from "@/lib/payments/provider";
import { notify } from "@/lib/services/notifications";
import { FOUNDING_PREMIUM_CODE } from "@/lib/services/founding-seller";

async function requireSeller() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
}

export async function getSellerPlanSummary() {
  const seller = await requireSeller();
  if (!seller) return null;
  const [limits, usage, credits] = await Promise.all([
    getEffectiveLimits(seller.id),
    getSellerUsage(seller.id),
    prisma.promotionalCredit.aggregate({
      where: { sellerId: seller.id, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      _sum: { amount: true },
    }),
  ]);
  return { limits, usage, creditBalance: credits._sum.amount ?? 0 };
}

/**
 * "Payment" here runs through the same MOCK provider that already backs
 * checkout — it's a real, honestly-labeled demo flow (see the checkout
 * page's own "payments are simulated" note), not a faked success. Xendit
 * replaces `provider: "MOCK"` with a real charge when it's integrated;
 * nothing else in this function needs to change.
 *
 * Handles any FREE/PRO/PREMIUM/FOUNDING_PREMIUM transition. Moving to a paid
 * plan charges that plan's full monthly price immediately (no proration —
 * this is a demo billing flow, not a real subscription system yet). Moving
 * to FREE keeps the seller's current paid benefits until their existing
 * period ends, matching how "cancel" always worked here.
 *
 * FOUNDING_PREMIUM is gated server-side on seller.foundingPremiumEligible —
 * never trust the frontend for this. A non-founding seller requesting it
 * (whether from a stale UI or a direct call) is refused here regardless of
 * what the client believes is on offer.
 *
 * PRO/PREMIUM both require birVerified — per the seller-tiers spec, only a
 * BIR-verified registered business can subscribe to a paid plan. BIR_VERIFIED
 * itself isn't a target a seller selects here at all: it's granted
 * automatically by verifyBirLicenseAction the moment verification happens.
 */
export async function changeSellerPlanAction(targetPlanCode: "FREE" | "PRO" | "PREMIUM" | typeof FOUNDING_PREMIUM_CODE) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  if (targetPlanCode === FOUNDING_PREMIUM_CODE && !seller.foundingPremiumEligible) {
    return { error: "Founding Premium is only available to Founding Sellers." };
  }
  if ((targetPlanCode === "PRO" || targetPlanCode === "PREMIUM") && !seller.birVerified) {
    return { error: "Pro and Premium require BIR verification first. Apply as a registered business and get verified to unlock these plans." };
  }

  const [targetPlan, existing] = await Promise.all([
    prisma.sellerPlan.findUnique({ where: { code: targetPlanCode } }),
    prisma.sellerSubscription.findUnique({ where: { sellerId: seller.id }, include: { plan: true } }),
  ]);
  if (!targetPlan) return { error: "That plan isn't available right now." };
  const currentlyActivePlanCode = existing?.status === "ACTIVE" && !existing.cancelAtPeriodEnd ? existing.plan.code : "FREE";

  if (targetPlanCode === "FREE") {
    if (!existing || existing.status !== "ACTIVE" || existing.cancelAtPeriodEnd) {
      return { error: "You're already on the Free plan." };
    }
    await prisma.sellerSubscription.update({ where: { sellerId: seller.id }, data: { cancelAtPeriodEnd: true } });
    revalidatePath("/studio/plan");
    return { success: true };
  }

  if (currentlyActivePlanCode === targetPlanCode) {
    return { error: `You're already on ${targetPlan.name}.` };
  }

  const provider = getPaymentProvider("GCASH");
  const result = await provider.createAndConfirm(targetPlan.monthlyPrice, `sub-${seller.id}-${Date.now()}`);
  if (result.status !== "SUCCEEDED") {
    return { error: "That payment didn't go through. Try again." };
  }

  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.sellerSubscription.upsert({
    where: { sellerId: seller.id },
    update: { planId: targetPlan.id, status: "ACTIVE", provider: "MOCK", providerRef: result.providerRef, currentPeriodEnd, cancelAtPeriodEnd: false },
    create: { sellerId: seller.id, planId: targetPlan.id, status: "ACTIVE", provider: "MOCK", providerRef: result.providerRef, currentPeriodEnd },
  });

  const creditConfig = await prisma.pricingConfig.findUnique({ where: { key: `${targetPlanCode.toLowerCase()}_monthly_credit_amount` } });
  const creditAmount = typeof creditConfig?.value === "number" ? creditConfig.value : 0;
  if (creditAmount > 0) {
    await prisma.promotionalCredit.create({
      data: { sellerId: seller.id, amount: creditAmount, source: "PRO_MONTHLY_GRANT", expiresAt: currentPeriodEnd },
    });
  }

  revalidatePath("/studio");
  revalidatePath("/studio/plan");
  return { success: true };
}

export interface BuyPromotionInput {
  productId: string;
  promotionTypeCode: string;
  placement: "HOMEPAGE" | "CATEGORY" | "SEARCH" | "DISCOVER";
  categorySlug?: string;
  price: number;
  days: number;
}

export async function buyPromotionAction(input: BuyPromotionInput) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  if (seller.status !== "APPROVED") return { error: "Your store needs to be approved and active to buy promotions." };
  // `days` and `price` come from the client. NaN/negative/huge values used to
  // slip through the range check (NaN compares false with everything) and
  // could buy an effectively unlimited promotion at the minimum price.
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 90) return { error: "Choose a promotion length between 1 and 90 days." };
  if (typeof input.price !== "number" || !Number.isFinite(input.price) || input.price <= 0) return { error: "Enter a valid price." };

  const [product, promotionType] = await Promise.all([
    prisma.product.findFirst({ where: { id: input.productId, sellerId: seller.id } }),
    prisma.promotionType.findUnique({ where: { code: input.promotionTypeCode } }),
  ]);
  if (!product) return { error: "Listing not found." };
  if (!promotionType || !promotionType.active || promotionType.category !== "PRODUCT") return { error: "That promotion isn't available." };
  if (input.price < promotionType.minPrice || input.price > promotionType.maxPrice) {
    return { error: `${promotionType.name} costs between ₱${promotionType.minPrice} and ₱${promotionType.maxPrice}.` };
  }

  const creditBalance = await prisma.promotionalCredit.aggregate({
    where: { sellerId: seller.id, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    _sum: { amount: true },
  });
  const availableCredits = creditBalance._sum.amount ?? 0;
  const paidWithCredits = availableCredits >= input.price;

  if (!paidWithCredits) {
    const provider = getPaymentProvider("GCASH");
    const result = await provider.createAndConfirm(input.price, `promo-${product.id}-${Date.now()}`);
    if (result.status !== "SUCCEEDED") return { error: "That payment didn't go through. Try again." };
  }

  const startAt = new Date();
  const endAt = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);

  const promotion = await prisma.promotion.create({
    data: {
      sellerId: seller.id,
      productId: product.id,
      promotionTypeId: promotionType.id,
      price: input.price,
      placement: input.placement,
      categorySlug: input.categorySlug,
      startAt,
      endAt,
      status: "ACTIVE",
      paidWithCredits,
    },
  });

  if (paidWithCredits) {
    await prisma.promotionalCredit.create({
      data: { sellerId: seller.id, amount: -input.price, source: "PROMOTION_SPEND", relatedPromotionId: promotion.id },
    });
  }

  await notify(seller.userId, "ORDER_CONFIRMED", "Promotion is live", `${promotionType.name} for "${product.title}" is now running.`, "/studio/promotions");

  revalidatePath("/studio/promotions");
  return { success: true };
}
