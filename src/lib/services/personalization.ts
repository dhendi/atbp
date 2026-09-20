import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { effectivePrice, isDealActive } from "@/lib/deals";
import { INTERESTS, getInterest } from "@/lib/interests";

const BUDGET_TAGS = new Set(["under-250", "under-500", "under-1000", "under-2500", "worth-the-splurge"]);

const PRODUCT_INCLUDE = { seller: true, auction: true } satisfies Prisma.ProductInclude;
type ProductWithSeller = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

/** Real, per-user recently-viewed product ids — reuses the existing ProductEvent
 * VIEW log (already written on every product page load) rather than a new table. */
export async function getRecentlyViewedProductIds(userId: string, limit = 8): Promise<string[]> {
  const rows = await prisma.productEvent.findMany({
    where: { userId, type: "VIEW" },
    orderBy: { createdAt: "desc" },
    distinct: ["productId"],
    take: limit,
    select: { productId: true },
  });
  return rows.map((r) => r.productId);
}

/** "Because you looked at X" — products sharing a category or tag with what the
 * user has actually viewed, excluding the viewed items themselves. `label` is a
 * real, specific reason for the title ("Pokémon", "Trading Cards") instead of
 * a generic "something similar" — preferring a fandom/vibe interest tag on the
 * most recently viewed item, falling back to its category name. */
export async function getBecauseYouLookedAt(
  userId: string,
  limit = 12
): Promise<{ source: string | null; label: string | null; products: ProductWithSeller[] }> {
  const viewedIds = await getRecentlyViewedProductIds(userId, 5);
  if (viewedIds.length === 0) return { source: null, label: null, products: [] };

  const viewed = await prisma.product.findMany({
    where: { id: { in: viewedIds } },
    select: { id: true, categoryId: true, tags: true, category: { select: { name: true } } },
  });
  const mostRecent = viewed.find((p) => p.id === viewedIds[0]);
  const sourceProductId = mostRecent?.id ?? null;
  const categoryIds = [...new Set(viewed.map((p) => p.categoryId))];
  const tags = [...new Set(viewed.flatMap((p) => p.tags as string[]))].slice(0, 6);

  const mostRecentTags = (mostRecent?.tags as string[] | undefined) ?? [];
  const interestTag = mostRecentTags.find((t) => !BUDGET_TAGS.has(t) && INTERESTS.some((i) => i.slug === t));
  const label = interestTag ? getInterest(interestTag).label : mostRecent?.category?.name ?? null;

  const products = await fetchByCategoryOrTags({ categoryIds, tags, excludeIds: viewedIds, limit });
  return { source: sourceProductId, label, products };
}

/** "Based on your searches" — matches recent search terms against title/description/tags. */
export async function getBasedOnYourSearches(userId: string, limit = 12): Promise<{ terms: string[]; products: ProductWithSeller[] }> {
  const searches = await prisma.searchLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    distinct: ["query"],
    take: 3,
    select: { query: true },
  });
  if (searches.length === 0) return { terms: [], products: [] };

  const terms = searches.map((s) => s.query);
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      OR: terms.flatMap((term) => [
        { title: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
      ]),
    },
    include: PRODUCT_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return { terms, products };
}

async function fetchByCategoryOrTags(opts: { categoryIds: string[]; tags: string[]; excludeIds: string[]; limit: number }) {
  if (opts.categoryIds.length === 0 && opts.tags.length === 0) return [];
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: opts.excludeIds },
      OR: [
        ...(opts.categoryIds.length ? [{ categoryId: { in: opts.categoryIds } }] : []),
        ...opts.tags.map((tag) => ({ tags: { array_contains: tag } })),
      ],
    },
    include: PRODUCT_INCLUDE,
    orderBy: { likeCount: "desc" },
    take: opts.limit,
  });
  return products;
}

/** Real per-user affinity signals — interests, wishlist, purchase history, and
 * followed sellers — shared by every "For You"-style ranking so each one reads
 * the same underlying behavior instead of re-deriving it. */
export async function getUserSignals(userId: string) {
  const [user, saved, orders, follows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { interests: true } }),
    prisma.savedProduct.findMany({ where: { userId }, select: { product: { select: { categoryId: true, tags: true } } }, take: 20 }),
    prisma.order.findMany({ where: { buyerId: userId }, select: { items: { select: { product: { select: { categoryId: true, tags: true } } } } }, take: 20 }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { sellerId: true } }),
  ]);

  const interestTags = (user?.interests as string[]) ?? [];
  const wishlistCategoryIds = saved.map((s) => s.product.categoryId).filter((v): v is string => !!v);
  const wishlistTags = saved.flatMap((s) => s.product.tags as string[]);
  const purchasedCategoryIds = orders.flatMap((o) => o.items.map((i) => i.product?.categoryId)).filter((v): v is string => !!v);
  const purchasedTags = orders.flatMap((o) => o.items.flatMap((i) => (i.product?.tags as string[]) ?? []));
  const followedSellerIds = follows.map((f) => f.sellerId);

  const categoryIds = [...new Set([...wishlistCategoryIds, ...purchasedCategoryIds])];
  const tags = [...new Set([...interestTags, ...wishlistTags, ...purchasedTags])];

  return { categoryIds, tags, followedSellerIds, hasSignal: categoryIds.length > 0 || tags.length > 0 || followedSellerIds.length > 0 };
}

/** Rank by how many distinct signals a candidate matches — simple, explainable scoring. */
export function scoreBySignals<T extends { categoryId: string; sellerId: string; tags: unknown }>(
  p: T,
  signals: { categoryIds: string[]; tags: string[]; followedSellerIds: string[] }
) {
  let s = 0;
  if (signals.categoryIds.includes(p.categoryId)) s += 1;
  if (signals.followedSellerIds.includes(p.sellerId)) s += 2;
  const pTags = p.tags as string[];
  s += pTags.filter((t) => signals.tags.includes(t)).length;
  return s;
}

/** The core "For You" ranking — combines real signals (interests, wishlist,
 * purchase history, followed sellers) with a simple weighted-count rule
 * rather than any ML model. New/inactive users fall back to trending+curated
 * at the call site, not here, so this stays a pure signal-based function. */
export async function getForYouProducts(userId: string, limit = 16) {
  const signals = await getUserSignals(userId);
  if (!signals.hasSignal) return [];

  const candidates = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        ...(signals.categoryIds.length ? [{ categoryId: { in: signals.categoryIds } }] : []),
        ...(signals.followedSellerIds.length ? [{ sellerId: { in: signals.followedSellerIds } }] : []),
        ...signals.tags.map((tag) => ({ tags: { array_contains: tag } })),
      ],
    },
    include: PRODUCT_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: limit * 3,
  });

  return candidates
    .map((p) => ({ p, s: scoreBySignals(p, signals) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ p }) => p);
}

/** "Deals For You" — active discounts narrowed to the categories, tags, and
 * followed sellers this specific user actually engages with, ranked by the
 * same signal-matching score as "For You". Distinct from the generic
 * "Deals today" shelf, which is just every active deal sorted by discount%. */
export async function getDealsForYou(userId: string, limit = 12) {
  const signals = await getUserSignals(userId);
  if (!signals.hasSignal) return [];

  const candidates = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      dealPrice: { not: null },
      OR: [
        ...(signals.categoryIds.length ? [{ categoryId: { in: signals.categoryIds } }] : []),
        ...(signals.followedSellerIds.length ? [{ sellerId: { in: signals.followedSellerIds } }] : []),
        ...signals.tags.map((tag) => ({ tags: { array_contains: tag } })),
      ],
    },
    include: PRODUCT_INCLUDE,
    take: limit * 3,
  });

  return candidates
    .filter((p) => isDealActive(p))
    .map((p) => ({ p, s: scoreBySignals(p, signals) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ p }) => p);
}

// A saved product whose status isn't one of these 404s on its own page (see
// product/[id]/page.tsx's notFound() check) — the wishlist still shows it
// (never silently drops a save), just as a non-clickable "no longer
// available" row instead of a live product card.
const VIEWABLE_PRODUCT_STATUSES = new Set(["ACTIVE", "SOLD_OUT"]);

/** Real price-drop / low-stock / back-in-stock detection for a user's wishlist,
 * computed by comparing the live product against the snapshot taken at save time. */
export async function getWishlistDigest(userId: string, limit = 12) {
  const saved = await prisma.savedProduct.findMany({
    where: { userId },
    include: { product: { include: PRODUCT_INCLUDE } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return saved.map((s) => {
    const isUnavailable = !VIEWABLE_PRODUCT_STATUSES.has(s.product.status);
    const effective = effectivePrice(s.product);
    const priceDrop = !isUnavailable && s.priceAtSave && effective < s.priceAtSave ? Math.round((s.priceAtSave - effective) * 100) / 100 : null;
    return {
      savedProductId: s.id,
      product: s.product,
      priceAtSave: s.priceAtSave,
      priceDrop,
      isLowStock: !isUnavailable && s.product.quantityAvailable > 0 && s.product.quantityAvailable <= 5,
      isUnavailable,
    };
  });
}
