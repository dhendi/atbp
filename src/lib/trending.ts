import { cachedQuery } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { AUCTIONS_ENABLED } from "@/lib/feature-flags";

// Spread into any general discovery feed's `where` — keeps auction listings
// out of passive recommendation surfaces (Trending, Hidden Gems, etc.) while
// auctions are held off, with nothing to undo when they're switched back on.
const EXCLUDE_AUCTIONS = AUCTIONS_ENABLED ? {} : { listingType: { not: "AUCTION" } };

type ProductWithRelations = Prisma.ProductGetPayload<{ include: { seller: true; auction: true } }>;

// Signal weights. Purchases and bids carry the most intent; a view is the
// weakest signal. Tune here rather than scattering magic numbers around.
const EVENT_WEIGHTS: Record<string, number> = {
  VIEW: 1,
  SAVE: 3,
  CART_ADD: 4,
  BID: 5,
  PURCHASE: 10,
};

export type ProductEventType = keyof typeof EVENT_WEIGHTS;

/**
 * Records a trending signal for a product. Deliberately excludes any event
 * performed by the product's own seller, so a seller can't inflate their own
 * trending score by viewing/saving/carting their own listing.
 */
export async function logProductEvent(productId: string, type: ProductEventType, userId?: string | null) {
  try {
    if (userId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { seller: { select: { userId: true } } },
      });
      if (!product) return;
      if (product.seller.userId === userId) return;
    }
    await prisma.productEvent.create({ data: { productId, type, userId: userId ?? undefined } });
  } catch {
    // Trending is a nice-to-have signal — never let logging failures break the real action.
  }
}

// The trending scan only ever looks at the last 7 days (see
// computeTrendingScores) — this table would otherwise grow forever, one row
// per view/save/cart-add. 30 days keeps a bit of buffer beyond the scoring
// window for debugging/future analytics without keeping the full history.
// Called by the maintenance cron (see api/cron/maintenance), not from any
// request path.
const PRODUCT_EVENT_RETENTION_DAYS = 30;

export async function pruneOldProductEvents() {
  const cutoff = new Date(Date.now() - PRODUCT_EVENT_RETENTION_DAYS * 86400000);
  const { count } = await prisma.productEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}

export interface TrendingScore {
  score: number;
  recent: number;
  prior: number;
  growth: number;
}

/**
 * Scores are always computed fresh from the last `windowDays` of engagement —
 * there is no stored "trending score" column to cache stale or manipulated
 * numbers in. The window is split in half so a product whose activity is
 * accelerating (more happening in the recent half than the prior half) scores
 * higher than one with the same total but flat/declining activity — that's
 * what lets a brand-new listing out-trend an old one with a bigger lifetime total.
 */
export async function computeTrendingScores(windowDays = 7): Promise<Map<string, TrendingScore>> {
  const now = Date.now();
  const windowStart = new Date(now - windowDays * 86400000);
  const midpoint = new Date(now - (windowDays / 2) * 86400000);

  const events = await prisma.productEvent.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { productId: true, type: true, createdAt: true },
  });

  const buckets = new Map<string, { recent: number; prior: number }>();
  for (const e of events) {
    const weight = EVENT_WEIGHTS[e.type] ?? 1;
    const bucket = buckets.get(e.productId) ?? { recent: 0, prior: 0 };
    if (e.createdAt >= midpoint) bucket.recent += weight;
    else bucket.prior += weight;
    buckets.set(e.productId, bucket);
  }

  const scores = new Map<string, TrendingScore>();
  for (const [productId, { recent, prior }] of buckets) {
    const growth = recent - prior;
    // Coefficients, tune independently:
    // - recent * 2 — the recent half always counts double prior, since it's
    //   what "trending right now" actually means.
    // - max(0, growth) * 3 — an extra bonus only when activity is
    //   accelerating (growth > 0), and weighted the heaviest of the three
    //   terms, so a product picking up speed can jump past one that's just
    //   bigger overall. Clamped at 0 so a cooling-off product isn't
    //   penalized twice (its shrunken `recent` term already reflects that).
    // - prior * 0.5 — still counts for something (a product with sustained
    //   activity across both halves isn't a fluke), but at half weight so
    //   old volume alone can't outrank real current interest.
    const score = recent * 2 + Math.max(0, growth) * 3 + prior * 0.5;
    scores.set(productId, { score, recent, prior, growth });
  }
  return scores;
}

// The engagement scan behind Trending/Hidden Gems/etc. reads every ProductEvent
// row in the window and is identical for every visitor — cache the (serializable)
// entries rather than the Map itself, since Next's data cache round-trips through
// JSON and a Map would come back empty.
const getCachedTrendingScoreEntries = cachedQuery(
  async (windowDays: number) => [...(await computeTrendingScores(windowDays)).entries()],
  ["trending-scores"],
  { revalidate: 60, tags: ["trending"] }
);

async function getTrendingScores(windowDays = 7): Promise<Map<string, TrendingScore>> {
  return new Map(await getCachedTrendingScoreEntries(windowDays));
}

export async function getTrendingProducts(opts: { limit?: number; categoryId?: string } = {}) {
  const limit = opts.limit ?? 20;
  const scores = await getTrendingScores();
  const rankedIds = [...scores.entries()].sort((a, b) => b[1].score - a[1].score).map(([id]) => id);

  const where: Record<string, unknown> = { status: "ACTIVE", ...EXCLUDE_AUCTIONS };
  if (opts.categoryId) where.categoryId = opts.categoryId;

  let products: ProductWithRelations[] = [];
  if (rankedIds.length) {
    products = await prisma.product.findMany({
      where: { ...where, id: { in: rankedIds.slice(0, limit * 3) } },
      include: { seller: true, auction: true },
    });
    products.sort((a, b) => (scores.get(b.id)?.score ?? 0) - (scores.get(a.id)?.score ?? 0));
  }

  // Cold-start fallback so the section/page isn't empty before real engagement builds up.
  if (products.length < limit) {
    const filler = await prisma.product.findMany({
      where: { ...where, id: { notIn: products.map((p) => p.id) } },
      include: { seller: true, auction: true },
      orderBy: { createdAt: "desc" },
      take: limit - products.length,
    });
    products = [...products, ...filler];
  }

  return products.slice(0, limit).map((p) => ({
    ...p,
    trendingScore: scores.get(p.id)?.score ?? 0,
    trendingGrowth: scores.get(p.id)?.growth ?? 0,
  }));
}

/** Products with the sharpest recent acceleration, regardless of absolute volume — gives small/new sellers a shot at visibility. */
export async function getRisingFastProducts(limit = 10) {
  const scores = await getTrendingScores();
  const risingIds = [...scores.entries()]
    .filter(([, s]) => s.growth > 0)
    .sort((a, b) => b[1].growth - a[1].growth)
    .slice(0, limit * 2)
    .map(([id]) => id);

  if (risingIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", ...EXCLUDE_AUCTIONS, id: { in: risingIds } },
    include: { seller: true, auction: true },
  });
  products.sort((a, b) => (scores.get(b.id)?.growth ?? 0) - (scores.get(a.id)?.growth ?? 0));
  return products.slice(0, limit).map((p) => ({ ...p, trendingScore: scores.get(p.id)?.score ?? 0, trendingGrowth: scores.get(p.id)?.growth ?? 0 }));
}

/** Cheap lookup used by ProductCard-rendering pages to decide whether to show the 🔥 badge. */
export async function getTrendingProductIdSet(limit = 30): Promise<Set<string>> {
  const scores = await getTrendingScores();
  const ids = [...scores.entries()]
    .filter(([, s]) => s.score > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([id]) => id);
  return new Set(ids);
}

/** A shop can trend too — rolls the same per-product engagement scores up to
 *  the seller level, so a small shop with several picking-up listings can
 *  outrank a big shop with one old bestseller. */
/** Unlike getTrendingProducts, this never backfills with arbitrary sellers —
 * "Trending Shops" has exactly one caller (the /trending page) and nothing
 * downstream needs a guaranteed-non-empty list the way cart/checkout's
 * generic "you might like" shelves do. Returning [] when there's no real
 * signal lets that page show an honest empty state instead of relabeling
 * arbitrary approved sellers as trending. */
export async function getTrendingSellers(limit = 8) {
  const scores = await getTrendingScores();
  if (scores.size === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: [...scores.keys()] }, status: "ACTIVE" },
    select: { id: true, sellerId: true },
  });

  const sellerScores = new Map<string, number>();
  for (const p of products) {
    const score = scores.get(p.id)?.score ?? 0;
    sellerScores.set(p.sellerId, (sellerScores.get(p.sellerId) ?? 0) + score);
  }

  const rankedSellerIds = [...sellerScores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (rankedSellerIds.length === 0) return [];

  const sellers = await prisma.sellerProfile.findMany({ where: { id: { in: rankedSellerIds }, status: "APPROVED" } });
  sellers.sort((a, b) => (sellerScores.get(b.id) ?? 0) - (sellerScores.get(a.id) ?? 0));
  return sellers;
}
