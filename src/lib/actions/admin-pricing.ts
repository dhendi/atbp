"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/services/audit-log";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function updateSellerPlanAction(planId: string, data: {
  monthlyPrice: number;
  transactionFeePercent: number;
  maxActiveListings: number;
  maxNewListingsPerMonth: number;
  maxAuctionsPerWeek: number;
  maxActiveAuctions: number;
}) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (Object.values(data).some((v) => v < 0)) return { error: "Values can't be negative." };

  await prisma.sellerPlan.update({ where: { id: planId }, data });
  await logAdminAction(admin.id, "UPDATE_SELLER_PLAN", "SellerPlan", planId, data);
  revalidatePath("/admin/pricing");
  revalidatePath("/pricing");
  updateTag("seller-plans");
  return { success: true };
}

export async function updatePromotionTypeAction(id: string, data: { minPrice: number; maxPrice: number; active: boolean }) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (data.minPrice < 0 || data.maxPrice < data.minPrice) return { error: "Check the price range." };

  await prisma.promotionType.update({ where: { id }, data });
  await logAdminAction(admin.id, "UPDATE_PROMOTION_TYPE", "PromotionType", id, data);
  revalidatePath("/admin/pricing");
  revalidatePath("/studio/promotions");
  return { success: true };
}

export async function updatePricingConfigAction(key: string, value: number) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (value < 0) return { error: "Value can't be negative." };

  await prisma.pricingConfig.update({ where: { key }, data: { value } });
  await logAdminAction(admin.id, "UPDATE_PRICING_CONFIG", "PricingConfig", key, { value });
  revalidatePath("/admin/pricing");
  return { success: true };
}

/**
 * Directly assigns a seller onto a specific plan — the lever that was
 * missing before: an admin could only adjust listing/auction *limits* via
 * SellerPlanOverride, never actually move a seller onto Pro/Premium/etc.
 * without them doing it themselves through the (mock) billing flow. Use for
 * comping a seller, fixing a billing mixup, or downgrading someone who
 * stopped paying outside the normal self-serve path. Skips payment entirely
 * — there's nothing to charge here, this just sets the record straight.
 */
export async function adminSetSellerPlanAction(sellerId: string, planCode: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const plan = await prisma.sellerPlan.findUnique({ where: { code: planCode } });
  if (!plan) return { error: "Plan not found." };
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return { error: "Seller not found." };

  await prisma.sellerSubscription.upsert({
    where: { sellerId },
    update: { planId: plan.id, status: "ACTIVE", cancelAtPeriodEnd: false, provider: "MOCK" },
    create: { sellerId, planId: plan.id, status: "ACTIVE", provider: "MOCK" },
  });
  await logAdminAction(admin.id, "ADMIN_SET_SELLER_PLAN", "SellerProfile", sellerId, { planCode, shopName: seller.shopName });
  revalidatePath("/admin/pricing");
  revalidatePath(`/admin/sellers/${sellerId}`);
  return { success: true };
}

export async function setSellerPlanOverrideAction(sellerId: string, data: {
  activeListingLimitOverride?: number | null;
  monthlyListingLimitOverride?: number | null;
  weeklyAuctionLimitOverride?: number | null;
  activeAuctionLimitOverride?: number | null;
  reason?: string;
}) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  await prisma.sellerPlanOverride.upsert({
    where: { sellerId },
    update: { ...data, createdByUserId: admin.id },
    create: { sellerId, ...data, createdByUserId: admin.id },
  });
  await logAdminAction(admin.id, "SET_SELLER_PLAN_OVERRIDE", "SellerProfile", sellerId, data);
  revalidatePath("/admin/pricing");
  return { success: true };
}

export async function removeSellerPlanOverrideAction(sellerId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  await prisma.sellerPlanOverride.deleteMany({ where: { sellerId } });
  await logAdminAction(admin.id, "REMOVE_SELLER_PLAN_OVERRIDE", "SellerProfile", sellerId);
  revalidatePath("/admin/pricing");
  return { success: true };
}
