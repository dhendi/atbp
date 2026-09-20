import { prisma } from "@/lib/prisma";

// Every number here is a real, live count — never a fabricated or randomized
// figure. If a signal can't be computed honestly (e.g. concurrent viewers,
// which would need real-time presence infrastructure this app doesn't have),
// it simply isn't offered here rather than being faked.

export const LOW_STOCK_THRESHOLD = 5;
export const MIN_CART_COUNT_TO_SHOW = 3;
export const MIN_SOLD_TODAY_TO_SHOW = 1;

/** How many *distinct carts* currently hold each product — a real, live count from CartItem. */
export async function getCartCounts(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await prisma.cartItem.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.productId, r._count._all]));
}

/** Real completed-purchase count for each product since local midnight today, from the ProductEvent log. */
export async function getSoldTodayCounts(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const rows = await prisma.productEvent.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, type: "PURCHASE", createdAt: { gte: startOfToday } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.productId, r._count._all]));
}

export interface SocialProofData {
  cartCount?: number;
  soldToday?: number;
  lowStock?: number; // set to quantityAvailable when it's low, so the UI can show "Only N left"
}

/** Batch-fetches every honest social-proof signal for a set of products in two queries total. */
export async function getSocialProofMap(
  products: { id: string; quantityAvailable: number }[]
): Promise<Map<string, SocialProofData>> {
  const ids = products.map((p) => p.id);
  const [cartCounts, soldToday] = await Promise.all([getCartCounts(ids), getSoldTodayCounts(ids)]);
  const map = new Map<string, SocialProofData>();
  for (const p of products) {
    const cartCount = cartCounts.get(p.id);
    const sold = soldToday.get(p.id);
    const data: SocialProofData = {};
    if (cartCount && cartCount >= MIN_CART_COUNT_TO_SHOW) data.cartCount = cartCount;
    if (sold && sold >= MIN_SOLD_TODAY_TO_SHOW) data.soldToday = sold;
    if (p.quantityAvailable > 0 && p.quantityAvailable <= LOW_STOCK_THRESHOLD) data.lowStock = p.quantityAvailable;
    if (Object.keys(data).length > 0) map.set(p.id, data);
  }
  return map;
}
