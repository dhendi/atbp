import { cachedQuery } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { AUCTIONS_ENABLED } from "@/lib/feature-flags";

const PRODUCT_INCLUDE = { seller: true, auction: true } satisfies Prisma.ProductInclude;

// Keeps auction listings out of passive/generic discovery surfaces (Most
// Loved, Hidden Gems) while auctions are held off — nothing to undo later.
const EXCLUDE_AUCTIONS: Prisma.ProductWhereInput = AUCTIONS_ENABLED ? {} : { listingType: { not: "AUCTION" } };

export function productsWithTag(tag: string): Prisma.ProductWhereInput {
  return { status: "ACTIVE", tags: { array_contains: tag } };
}

export function productsWithAnyTag(tags: string[]): Prisma.ProductWhereInput {
  return { status: "ACTIVE", OR: tags.map((tag) => ({ tags: { array_contains: tag } })) };
}

// Every function below is a shared, non-personalized discovery surface — the
// same result for every visitor — so each is wrapped in unstable_cache to
// spare Neon a repeat query on every pageview. 60s revalidate keeps them
// fresh enough that a new listing shows up within a minute without needing
// on-demand revalidateTag() wiring into every mutation path.

export const getProductsByInterest = cachedQuery(
  async (slug: string, limit = 12) =>
    prisma.product.findMany({ where: productsWithTag(slug), include: PRODUCT_INCLUDE, orderBy: { createdAt: "desc" }, take: limit }),
  ["products-by-interest"],
  { revalidate: 60, tags: ["products"] }
);

export const countProductsByInterest = cachedQuery(
  async (slug: string) => prisma.product.count({ where: productsWithTag(slug) }),
  ["count-products-by-interest"],
  { revalidate: 60, tags: ["products"] }
);

/** Strong recent engagement — the "Trending This Week" surface (separate from the
 *  ProductEvent-derived lib/trending.ts score used for the badge/algorithmic ranking). */
export const getMostLoved = cachedQuery(
  async (limit = 12) =>
    prisma.product.findMany({
      where: { status: "ACTIVE", ...EXCLUDE_AUCTIONS },
      include: PRODUCT_INCLUDE,
      orderBy: [{ likeCount: "desc" }, { soldCount: "desc" }],
      take: limit,
    }),
  ["most-loved"],
  { revalidate: 60, tags: ["products"] }
);

/** Decent quality, low exposure — genuinely worth surfacing precisely because
 *  algorithmic sorts (trending, most-loved) would otherwise bury them. */
// "Ukay-ukay" is the Filipino term for thrifted/secondhand clothing — pre-loved
// fashion, not a new listing type. Filters the existing category + condition
// fields rather than tagging anything new: fashion-adjacent categories, and a
// condition that actually reads as pre-loved (not BRAND_NEW, and EXCELLENT is
// deliberately excluded too — a seller would list that as near-new, not ukay).
const UKAY_CATEGORY_SLUGS = ["fashion", "streetwear", "bags"];
const UKAY_CONDITIONS = ["LIKE_NEW", "GOOD", "FAIR"];

export const getUkayFinds = cachedQuery(
  async (limit = 12) =>
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        category: { slug: { in: UKAY_CATEGORY_SLUGS } },
        condition: { in: UKAY_CONDITIONS },
        ...EXCLUDE_AUCTIONS,
      },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ["ukay-finds"],
  { revalidate: 60, tags: ["products"] }
);

/** "Sulit" = worth it / great value. Reuses the existing under-500 budget tag
 * (see autoTags in prisma/seed.ts and lib/interests.ts) rather than a new
 * price threshold. */
export const getSulitFinds = cachedQuery(
  async (limit = 12) =>
    prisma.product.findMany({
      where: { ...productsWithTag("under-500"), ...EXCLUDE_AUCTIONS },
      include: PRODUCT_INCLUDE,
      orderBy: { likeCount: "desc" },
      take: limit,
    }),
  ["sulit-finds"],
  { revalidate: 60, tags: ["products"] }
);

export const getHiddenGems = cachedQuery(
  async (limit = 12) => {
    const candidates = await prisma.product.findMany({
      where: { status: "ACTIVE", viewCount: { lt: 400 }, ...EXCLUDE_AUCTIONS },
      include: PRODUCT_INCLUDE,
      orderBy: { likeCount: "desc" },
      take: limit * 3,
    });
    return candidates.slice(0, limit);
  },
  ["hidden-gems"],
  { revalidate: 60, tags: ["products"] }
);

/** Newer sellers already gaining real traction — distinct from "Shops to check out",
 *  which favors established/verified shops. */
export const getRisingShops = cachedQuery(
  async (limit = 8) => {
    const sellers = await prisma.sellerProfile.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ createdAt: "desc" }],
      take: limit * 4,
      include: { products: { where: { status: "ACTIVE" }, take: 6, orderBy: { createdAt: "desc" } } },
    });
    return sellers
      .filter((s) => s.followerCount > 0 || s.totalSales > 0)
      .sort((a, b) => b.followerCount - a.followerCount)
      .slice(0, limit);
  },
  ["rising-shops"],
  { revalidate: 60, tags: ["sellers"] }
);

/** Real "customers who bought this also bought" — derived from actual order
 *  co-occurrence (OrderItems that shared an order with this product), never
 *  a guessed/curated pairing. Falls back to nothing if there's no order
 *  history yet rather than inventing a pairing. */
export const getFrequentlyBoughtTogether = cachedQuery(
  async (productId: string, limit = 4) => {
    const coOrders = await prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
    });
    const orderIds = [...new Set(coOrders.map((o) => o.orderId))];
    if (orderIds.length === 0) return [];

    const coItems = await prisma.orderItem.findMany({
      where: { orderId: { in: orderIds }, productId: { not: productId } },
      select: { productId: true },
    });
    const counts = new Map<string, number>();
    for (const item of coItems) counts.set(item.productId, (counts.get(item.productId) ?? 0) + 1);
    const rankedIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, limit);
    if (rankedIds.length === 0) return [];

    const products = await prisma.product.findMany({
      where: { id: { in: rankedIds }, status: "ACTIVE" },
      include: PRODUCT_INCLUDE,
    });
    return rankedIds.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  },
  ["frequently-bought-together"],
  { revalidate: 60, tags: ["products"] }
);

/** Other active listings from the same shop — distinct from "You might also
 *  like" (same category, any seller) and from "Frequently bought together". */
export const getMoreFromShop = cachedQuery(
  async (sellerId: string, excludeProductId: string, limit = 8) =>
    prisma.product.findMany({
      where: { sellerId, status: "ACTIVE", id: { not: excludeProductId } },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ["more-from-shop"],
  { revalidate: 60, tags: ["products"] }
);

/** "Related searches" — a handful of this product's own real interest tags,
 *  each linked to its live discovery view with a real representative image
 *  (the tag's own top product), rather than any invented search term. */
export const getRelatedSearchTags = cachedQuery(
  async (tags: string[], excludeSlugs: string[], limit = 8) => {
    const candidates = tags.filter((t) => !excludeSlugs.includes(t)).slice(0, limit);
    if (candidates.length === 0) return [];
    const images = await Promise.all(
      candidates.map((slug) =>
        prisma.product.findFirst({ where: { status: "ACTIVE", tags: { array_contains: slug } }, select: { images: true } })
      )
    );
    return candidates
      .map((slug, i) => ({ slug, image: (images[i]?.images as string[] | undefined)?.[0] }))
      .filter((c) => !!c.image);
  },
  ["related-search-tags"],
  { revalidate: 60, tags: ["products"] }
);

/** Other shops selling in the same categories as this one, ranked by how many
 *  active listings they have in the categories this seller also sells in —
 *  real catalog overlap, never a guessed similarity score. */
export const getSimilarSellers = cachedQuery(
  async (sellerId: string, limit = 8) => {
    const myProducts = await prisma.product.findMany({ where: { sellerId, status: "ACTIVE" }, select: { categoryId: true } });
    const categoryIds = [...new Set(myProducts.map((p) => p.categoryId))];
    if (categoryIds.length === 0) return [];

    const overlapping = await prisma.product.findMany({
      where: { categoryId: { in: categoryIds }, status: "ACTIVE", sellerId: { not: sellerId } },
      select: { sellerId: true },
    });
    const counts = new Map<string, number>();
    for (const p of overlapping) counts.set(p.sellerId, (counts.get(p.sellerId) ?? 0) + 1);
    const rankedIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).slice(0, limit);
    if (rankedIds.length === 0) return [];

    const sellers = await prisma.sellerProfile.findMany({
      where: { id: { in: rankedIds }, status: "APPROVED" },
      include: {
        products: { where: { status: "ACTIVE" }, take: 4, orderBy: { createdAt: "desc" } },
        _count: { select: { products: { where: { status: "ACTIVE", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } } } },
      },
    });
    return rankedIds.map((id) => sellers.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
  },
  ["similar-sellers"],
  { revalidate: 60, tags: ["sellers"] }
);

// A Collection with only a handful of real items looks broken/sparse next to
// every other section on a public page — same "hide until there's enough
// real signal" instinct as getTrendingSellers in lib/trending.ts (never pad
// a section out to look bigger than the curation actually is). Admin still
// sees every collection regardless of size, via its own direct query in
// admin/collections/page.tsx — only these public reads gate on this.
const MIN_PUBLIC_COLLECTION_ITEMS = 3;

function collectionHasEnoughContent(c: { type: string; products: unknown[]; sellers: unknown[] }) {
  // SHOPS collections are curated as a list of sellers (see collection-row.tsx —
  // admin only ever adds sellers to a SHOPS collection and products to any
  // other type), so it's sellers.length that has to clear the bar for that type.
  const count = c.type === "SHOPS" ? c.sellers.length : c.products.length;
  return count >= MIN_PUBLIC_COLLECTION_ITEMS;
}

export const getActiveCollections = cachedQuery(
  async (type: "PICK" | "SEASONAL" | "SHOPS") => {
    const collections = await prisma.collection.findMany({
      where: { type, active: true },
      orderBy: { order: "asc" },
      include: {
        products: { orderBy: { order: "asc" }, include: { product: { include: PRODUCT_INCLUDE } } },
        sellers: { orderBy: { order: "asc" }, include: { seller: true } },
      },
    });
    return collections.filter(collectionHasEnoughContent);
  },
  ["active-collections"],
  { revalidate: 60, tags: ["collections"] }
);

// Returns null both when the slug doesn't exist and when the collection
// exists but isn't ready for a public audience (inactive, or too sparse —
// see collectionHasEnoughContent above) — the page treats both the same way
// (notFound()), so there's no separate "found but hidden" state to leak.
export const getCollectionBySlug = cachedQuery(
  async (slug: string) => {
    const collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        products: { orderBy: { order: "asc" }, include: { product: { include: PRODUCT_INCLUDE } } },
        sellers: { orderBy: { order: "asc" }, include: { seller: true } },
      },
    });
    if (!collection || !collection.active || !collectionHasEnoughContent(collection)) return null;
    return collection;
  },
  ["collection-by-slug"],
  { revalidate: 60, tags: ["collections"] }
);
