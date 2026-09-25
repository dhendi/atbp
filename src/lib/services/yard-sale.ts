import { cachedQuery } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

export const YARD_SALE_SOFT_ITEM_LIMIT = 25;
export const YARD_SALE_MAX_DAYS = 31; // "1 day up to 1 month"

/** No hard cap on Yard Sale items — past the soft limit this just returns a
 * warning string for the UI to show as a gentle nudge, never blocks adding. */
export async function yardSaleItemCountWarning(yardSaleId: string): Promise<string | null> {
  const count = await prisma.product.count({ where: { yardSaleId, status: "ACTIVE" } });
  if (count + 1 > YARD_SALE_SOFT_ITEM_LIMIT) {
    return "That's a lot for a one-time sale. A BIR-verified storefront gets you unlimited ongoing listings.";
  }
  return null;
}

/** Finds Yard Sales whose endDate has passed but are still marked ACTIVE, and
 * archives them (and their products) in two cheap batch queries. Also called
 * from the daily maintenance cron (see api/cron/maintenance) as a backstop —
 * still called from high-traffic read paths too (Discover, the seller's own
 * Yard Sale dashboard) since the cron is Hobby-plan-limited to once a day,
 * too infrequent on its own to keep this feeling live. Idempotent and safe
 * to call liberally: a no-op once nothing is overdue. */
export async function expireOverdueYardSales() {
  const now = new Date();
  const overdue = await prisma.yardSale.findMany({ where: { status: "ACTIVE", endDate: { lt: now } }, select: { id: true } });
  if (overdue.length === 0) return 0;

  const ids = overdue.map((y) => y.id);
  await prisma.yardSale.updateMany({ where: { id: { in: ids } }, data: { status: "ENDED" } });
  await prisma.product.updateMany({ where: { yardSaleId: { in: ids }, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
  return ids.length;
}

export async function getActiveYardSale(sellerId: string) {
  await expireOverdueYardSales();
  return prisma.yardSale.findFirst({ where: { sellerId, status: "ACTIVE" } });
}

const yardSaleCardInclude = { seller: true, products: { where: { status: "ACTIVE" as const }, take: 4 }, _count: { select: { products: { where: { status: "ACTIVE" as const } } } } };

export const getYardSalesNearby = cachedQuery(
  async (area: string, limit = 10) => {
    await expireOverdueYardSales();
    return prisma.yardSale.findMany({
      where: { status: "ACTIVE", seller: { status: "APPROVED" }, city: area },
      include: yardSaleCardInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
  ["yard-sales-nearby"],
  { revalidate: 60, tags: ["yard-sales"] }
);

/** Overlaps the upcoming Friday-Sunday window (or the current one, if today is already Fri-Sun). */
export const getYardSalesThisWeekend = cachedQuery(
  async (limit = 10) => {
    await expireOverdueYardSales();
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const daysUntilFriday = (5 - day + 7) % 7;
    const weekendStart = new Date(now);
    weekendStart.setDate(now.getDate() + daysUntilFriday);
    weekendStart.setHours(0, 0, 0, 0);
    const weekendEnd = new Date(weekendStart);
    weekendEnd.setDate(weekendStart.getDate() + 2);
    weekendEnd.setHours(23, 59, 59, 999);

    return prisma.yardSale.findMany({
      where: { status: "ACTIVE", seller: { status: "APPROVED" }, startDate: { lte: weekendEnd }, endDate: { gte: weekendStart } },
      include: yardSaleCardInclude,
      orderBy: { startDate: "asc" },
      take: limit,
    });
  },
  ["yard-sales-this-weekend"],
  { revalidate: 60, tags: ["yard-sales"] }
);

/** Ranked by total views across each sale's items — the cheapest existing
 * engagement signal (Product.viewCount), not a new trending model. */
export const getTrendingYardSales = cachedQuery(
  async (limit = 10) => {
    await expireOverdueYardSales();
    const grouped = await prisma.product.groupBy({
      by: ["yardSaleId"],
      where: { yardSaleId: { not: null }, status: "ACTIVE" },
      _sum: { viewCount: true },
      orderBy: { _sum: { viewCount: "desc" } },
      take: limit,
    });
    const ids = grouped.map((g) => g.yardSaleId).filter((id): id is string => !!id);
    if (ids.length === 0) return [];
    const order = new Map(ids.map((id, i) => [id, i]));
    const yardSales = await prisma.yardSale.findMany({ where: { id: { in: ids }, status: "ACTIVE", seller: { status: "APPROVED" } }, include: yardSaleCardInclude });
    return yardSales.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  },
  ["trending-yard-sales"],
  { revalidate: 60, tags: ["yard-sales"] }
);

export const getAllActiveYardSales = cachedQuery(
  async (limit = 60) => {
    await expireOverdueYardSales();
    return prisma.yardSale.findMany({ where: { status: "ACTIVE", seller: { status: "APPROVED" } }, include: yardSaleCardInclude, orderBy: { createdAt: "desc" }, take: limit });
  },
  ["all-active-yard-sales"],
  { revalidate: 60, tags: ["yard-sales"] }
);

export const getYardSalesEndingSoon = cachedQuery(
  async (limit = 10, withinHours = 48) => {
    await expireOverdueYardSales();
    const now = new Date();
    const cutoff = new Date(now.getTime() + withinHours * 3600000);
    return prisma.yardSale.findMany({
      where: { status: "ACTIVE", seller: { status: "APPROVED" }, endDate: { gte: now, lte: cutoff } },
      include: yardSaleCardInclude,
      orderBy: { endDate: "asc" },
      take: limit,
    });
  },
  ["yard-sales-ending-soon"],
  { revalidate: 60, tags: ["yard-sales"] }
);
