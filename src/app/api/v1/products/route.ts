import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRODUCT_TYPES } from "@/lib/constants";
import { AUCTIONS_ENABLED } from "@/lib/feature-flags";

/**
 * GET /api/v1/products — the mobile app's main browse/search feed. Public
 * (no auth required), mirrors the filtering /discover already does server-
 * side, just returned as JSON instead of rendered HTML.
 *
 * Query params (all optional):
 *   q            free-text search (title contains, case-insensitive)
 *   category     a Category.slug
 *   minPrice/maxPrice   numbers
 *   sort         "newest" (default) | "price_asc" | "price_desc" | "trending"
 *   cursor       last item's id from the previous page (keyset pagination)
 *   limit        1–50, default 20
 */
// "trending" isn't a stored column (see lib/trending.ts — it's computed from
// ProductEvent rows), so it isn't a sort option here yet; add a
// GET /api/v1/products/trending route reusing getTrendingProducts if the
// mobile app needs a Trending tab.
const SORTS = {
  newest: { createdAt: "desc" as const },
  price_asc: { price: "asc" as const },
  price_desc: { price: "desc" as const },
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().slice(0, 100);
  const category = url.searchParams.get("category")?.trim();
  const minPrice = Number(url.searchParams.get("minPrice"));
  const maxPrice = Number(url.searchParams.get("maxPrice"));
  const sortKey = (url.searchParams.get("sort") ?? "newest") as keyof typeof SORTS;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);
  const typeParam = url.searchParams.get("type");
  const type = PRODUCT_TYPES.some((t) => t.value === typeParam) ? typeParam : null;
  // onDeal=1 → only listings with a live deal price, same window check as
  // isDealActive in lib/deals.ts (no start = already started, no end = open-ended).
  const onDeal = url.searchParams.get("onDeal") === "1";
  const now = new Date();

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      seller: { status: "APPROVED" },
      // Auctions are switched off at launch (AUCTIONS_ENABLED), so they never
      // appear in a browse feed — same as the web app's EXCLUDE_AUCTIONS.
      ...(AUCTIONS_ENABLED ? {} : { listingType: { not: "AUCTION" } }),
      ...(type ? { type } : {}),
      ...(onDeal
        ? {
            dealPrice: { not: null },
            AND: [
              { OR: [{ dealStartAt: null }, { dealStartAt: { lte: now } }] },
              { OR: [{ dealEndAt: null }, { dealEndAt: { gt: now } }] },
            ],
          }
        : {}),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(Number.isFinite(minPrice) && minPrice > 0 ? { price: { gte: minPrice } } : {}),
      ...(Number.isFinite(maxPrice) && maxPrice > 0 ? { price: { lte: maxPrice } } : {}),
    },
    select: {
      id: true, title: true, price: true, compareAtPrice: true, dealPrice: true, dealStartAt: true, dealEndAt: true, images: true,
      condition: true, quantityAvailable: true, likeCount: true, status: true, listingType: true,
      seller: { select: { shopName: true, handle: true, rating: true, verified: true, isSampleContent: true } },
    },
    orderBy: SORTS[sortKey] ?? SORTS.newest,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit,
  });

  const nextCursor = products.length === limit ? products[products.length - 1].id : null;
  return NextResponse.json({ products, nextCursor });
}
