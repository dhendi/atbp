import { cachedQuery } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { currentUtcMonth, previousUtcMonth, utcMonthStart, utcMonthEnd } from "@/lib/utc-month";

export const CLOSET_ACTIVE_ITEM_CAP = 20;
export const CLOSET_MONTHLY_SALES_CAP = 50;
export const CLOSET_STALE_DAYS = 90;

/** Every seller who's chosen My Closet gets exactly one, created the first
 * time they need it (onboarding, or switching into Closet mode later). */
export async function getOrCreateCloset(sellerId: string, defaultTitle: string) {
  const existing = await prisma.closet.findUnique({ where: { sellerId } });
  if (existing) return existing;
  return prisma.closet.create({ data: { sellerId, title: defaultTitle } });
}

export interface LimitCheck {
  allowed: boolean;
  error?: string;
}

/** Call before adding a new item to a Closet — hard cap, unlike Yard Sale's soft nudge. */
export async function assertCanAddClosetItem(closetId: string): Promise<LimitCheck> {
  const activeCount = await prisma.product.count({ where: { closetId, status: "ACTIVE" } });
  if (activeCount >= CLOSET_ACTIVE_ITEM_CAP) {
    return { allowed: false, error: `Your Closet is at its ${CLOSET_ACTIVE_ITEM_CAP}-item limit. Remove or sell something before adding more.` };
  }
  return { allowed: true };
}

async function pauseClosetListings(closetId: string) {
  await prisma.product.updateMany({ where: { closetId, status: "ACTIVE" }, data: { status: "PAUSED_CAP" } });
}

async function unpauseClosetListings(closetId: string) {
  await prisma.product.updateMany({ where: { closetId, status: "PAUSED_CAP" }, data: { status: "ACTIVE" } });
}

async function recordCapHit(closet: {
  id: string;
  monthlyCapStreak: number;
  lastCapHitMonth: string | null;
  capNudgeShown: boolean;
  seller: { userId: string; shopName: string };
}, month: string) {
  if (closet.lastCapHitMonth === month) return; // idempotent within a month

  const wasConsecutive = closet.lastCapHitMonth === previousUtcMonth(month);
  const streak = wasConsecutive ? closet.monthlyCapStreak + 1 : 1;
  const shouldNudge = streak >= 2 && !closet.capNudgeShown;

  await prisma.closet.update({
    where: { id: closet.id },
    data: { monthlyCapStreak: streak, lastCapHitMonth: month, capNudgeShown: shouldNudge ? true : closet.capNudgeShown },
  });

  if (shouldNudge) {
    await notify(
      closet.seller.userId,
      "REMINDER",
      "You're consistently maxing out your Closet's monthly sales",
      "Get BIR verified to open My Shop and remove the 50-sale monthly cap. It's free.",
      "/studio/plan"
    );
  }
}

/** Re-derives a Closet's monthly-sales-cap state from live order data — call
 * after an order containing Closet items is delivered/completed, and it's
 * safe to call anytime else too (idempotent). No cron in this app, so this
 * also doubles as the lazy month-rollover unpause check. */
export async function syncClosetMonthlySalesCap(closetId: string) {
  const closet = await prisma.closet.findUnique({ where: { id: closetId }, include: { seller: true } });
  if (!closet) return;

  const month = currentUtcMonth();
  const soldThisMonth = await prisma.order.count({
    where: { items: { some: { product: { closetId } } }, deliveredAt: { gte: utcMonthStart(month), lt: utcMonthEnd(month) } },
  });

  if (soldThisMonth >= CLOSET_MONTHLY_SALES_CAP) {
    await pauseClosetListings(closetId);
    await recordCapHit(closet, month);
  } else {
    await unpauseClosetListings(closetId);
    if (closet.lastCapHitMonth && closet.lastCapHitMonth !== month) {
      await prisma.closet.update({ where: { id: closetId }, data: { monthlyCapStreak: 0, capNudgeShown: false } });
    }
  }
}

/** The 90-day "still have it?" check-in — a nudge, not an expiration. Call
 * from the seller's own Closet dashboard load; only ever nudges once per
 * staleness episode (confirming or removing the item is what re-arms it). */
export async function checkClosetStaleness(closetId: string) {
  const staleThreshold = new Date(Date.now() - CLOSET_STALE_DAYS * 86400000);
  const staleItems = await prisma.product.findMany({
    where: {
      closetId,
      status: "ACTIVE",
      closetConfirmedAt: { lt: staleThreshold },
      staleNudgeSentAt: null,
    },
    include: { closet: { include: { seller: true } } },
  });

  for (const item of staleItems) {
    if (!item.closet) continue;
    await prisma.product.update({ where: { id: item.id }, data: { staleNudgeSentAt: new Date() } });
    await notify(
      item.closet.seller.userId,
      "REMINDER",
      "Still have this?",
      `"${item.title}" has been up for ${CLOSET_STALE_DAYS} days. Confirm it's still available or remove it from your Closet.`,
      "/studio/closet"
    );
  }
}

const closetCardInclude = { seller: true, products: { where: { status: "ACTIVE" as const }, take: 4 }, _count: { select: { products: { where: { status: "ACTIVE" as const } } } } };

export const getClosetsNearby = cachedQuery(
  async (area: string, limit = 10) =>
    prisma.closet.findMany({ where: { city: area }, include: closetCardInclude, orderBy: { createdAt: "desc" }, take: limit }),
  ["closets-nearby"],
  { revalidate: 60, tags: ["closets"] }
);

export const getAllClosets = cachedQuery(
  async (limit = 60) => prisma.closet.findMany({ include: closetCardInclude, orderBy: { createdAt: "desc" }, take: limit }),
  ["all-closets"],
  { revalidate: 60, tags: ["closets"] }
);

export const getFeaturedClosets = cachedQuery(
  async (limit = 10) =>
    prisma.closet.findMany({ where: { featured: true }, include: closetCardInclude, orderBy: { createdAt: "desc" }, take: limit }),
  ["featured-closets"],
  { revalidate: 60, tags: ["closets"] }
);

/** Ranked by total views across each Closet's items — same cheap-reuse signal as Yard Sale trending. */
export const getTrendingClosets = cachedQuery(
  async (limit = 10) => {
    const grouped = await prisma.product.groupBy({
      by: ["closetId"],
      where: { closetId: { not: null }, status: "ACTIVE" },
      _sum: { viewCount: true },
      orderBy: { _sum: { viewCount: "desc" } },
      take: limit,
    });
    const ids = grouped.map((g) => g.closetId).filter((id): id is string => !!id);
    if (ids.length === 0) return [];
    const order = new Map(ids.map((id, i) => [id, i]));
    const closets = await prisma.closet.findMany({ where: { id: { in: ids } }, include: closetCardInclude });
    return closets.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  },
  ["trending-closets"],
  { revalidate: 60, tags: ["closets"] }
);

/** Reuses the site's existing signal-based personalization (categories from
 * wishlist/purchase/interests — see getUserSignals). Falls back to a simple
 * recency rotation for signal-less/logged-out visitors rather than new
 * recommendation infrastructure. */
export async function getClosetsForYou(userId: string | undefined, limit = 10) {
  if (userId) {
    const { getUserSignals } = await import("@/lib/services/personalization");
    const signals = await getUserSignals(userId);
    if (signals.categoryIds.length > 0) {
      const matches = await prisma.closet.findMany({
        where: { products: { some: { categoryId: { in: signals.categoryIds }, status: "ACTIVE" } } },
        include: closetCardInclude,
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      if (matches.length > 0) return matches;
    }
  }
  return prisma.closet.findMany({ include: closetCardInclude, orderBy: { createdAt: "desc" }, take: limit });
}
