import { prisma } from "@/lib/prisma";

/** One active third-party ad for a placement, if any campaign has bought one — clearly separate from seller Promotions. */
export async function getActiveAd(placement: "HOMEPAGE" | "CATEGORY" | "SEARCH" | "SELLER_PAGE" | "EVENT_PAGE", opts?: { categorySlug?: string }) {
  const now = new Date();
  const ad = await prisma.advertisement.findFirst({
    where: {
      status: "ACTIVE",
      campaign: { status: "ACTIVE", startAt: { lte: now }, endAt: { gte: now } },
      placements: { some: { placement, ...(opts?.categorySlug ? { categorySlug: opts.categorySlug } : {}) } },
    },
    include: { campaign: { include: { advertiser: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ad;
}

export async function logAdImpression(adId: string) {
  await prisma.advertisement.update({ where: { id: adId }, data: { impressions: { increment: 1 } } }).catch(() => {});
}

export async function logAdClick(adId: string) {
  await prisma.advertisement.update({ where: { id: adId }, data: { clicks: { increment: 1 } } }).catch(() => {});
}
