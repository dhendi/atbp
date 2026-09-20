import { prisma } from "@/lib/prisma";

/** Only ever returns placements the seller actually paid for and that are currently running — nothing here is inferred or organic. */
export async function getActivePromotedProducts(placement: "HOMEPAGE" | "DISCOVER" | "SEARCH" | "CATEGORY", opts?: { categorySlug?: string; limit?: number }) {
  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: {
      placement,
      status: "ACTIVE",
      startAt: { lte: now },
      endAt: { gte: now },
      ...(placement === "CATEGORY" && opts?.categorySlug ? { categorySlug: opts.categorySlug } : {}),
      product: { status: "ACTIVE" },
    },
    include: { product: { include: { seller: true, auction: true } }, promotionType: true },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 6,
  });
  return promotions;
}

export async function logPromotionImpression(promotionId: string) {
  await prisma.promotion.update({ where: { id: promotionId }, data: { impressions: { increment: 1 } } }).catch(() => {});
}

export async function logPromotionClick(promotionId: string) {
  await prisma.promotion.update({ where: { id: promotionId }, data: { clicks: { increment: 1 } } }).catch(() => {});
}

/** Sweeps promotions whose window has ended. getActivePromotedProducts above
 * already filters `endAt: { gte: now }` directly, so an expired promotion
 * never actually stays visible without this running — this just keeps the
 * `status` column itself correct for reporting/admin views. Called from the
 * daily maintenance cron (see api/cron/maintenance) rather than a read path,
 * since nothing user-facing depends on it running promptly. */
export async function settleExpiredPromotions() {
  const { count } = await prisma.promotion.updateMany({
    where: { status: "ACTIVE", endAt: { lt: new Date() } },
    data: { status: "ENDED" },
  });
  return count;
}
