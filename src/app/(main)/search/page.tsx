import type { Metadata } from "next";
import { Search as SearchIcon, TrendingUp, Sparkles, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/domain/product-card";
import { CategoriesMenu } from "@/components/domain/categories-menu";
import { EmptyState } from "@/components/domain/empty-state";
import { SearchBox } from "./search-box";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheck } from "lucide-react";
import { toProductCardData } from "@/lib/product-card-data";
import { getTrendingProductIdSet } from "@/lib/trending";
import { getSelectedArea } from "@/lib/services/local";
import { auth } from "@/lib/auth";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { NearMeToggle } from "./near-me-toggle";
import { SearchFilterBar } from "./search-filter-bar";
import { INTERESTS, DISCOVERY_SEARCH_COLLECTIONS } from "@/lib/interests";
import { getCategoriesWithChildren, resolveCategoryIds } from "@/lib/categories";
import { applyAttributeFilters, isFoodCategorySlug } from "@/lib/attribute-filters";
import { fuzzyTextMatches, normalizeText, relevanceRank } from "@/lib/search-text";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; near?: string; category?: string; price?: string; attr?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const title = q ? `Search results for "${q}"` : "Search";
  const description = q
    ? `Search results for "${q}" on ATBP: handmade, vintage, pre-loved, and collectible finds from independent sellers across the Philippines.`
    : "Search ATBP for handmade, vintage, pre-loved, and collectible items, plus shops, drops, and events from independent sellers across the Philippines.";

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Recognizes the ways people actually type a peso budget: "under 500",
// "under ₱500", a bare "₱500" or "P500" (common PH shorthand), or "500 pesos" —
// not just the "under X" phrasing. Returns the leftover text so a compound
// query like "vintage under 500" still fuzzy-matches "vintage" against titles
// instead of throwing the whole query away once a price is found.
function parseBudget(q: string): { maxPrice: number | null; remainder: string } {
  const patterns = [
    /(?:under|below)\s*(?:₱|php)?\s*([\d,]+)/i,
    /₱\s*([\d,]+)/,
    /\bphp\s*([\d,]+)/i,
    /\bP([\d,]+)\b/,
    /\b([\d,]+)\s*pesos?\b/i,
  ];
  for (const pattern of patterns) {
    const match = q.match(pattern);
    if (match) {
      const value = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0) {
        return { maxPrice: value, remainder: q.replace(match[0], "").trim() };
      }
    }
  }
  return { maxPrice: null, remainder: q };
}

function parseAreaQuery(q: string): string | null {
  const match = q.match(/(?:shops?|sellers?)\s+(?:in|from|near)\s+([a-z\s]+)/i);
  return match ? match[1].trim() : null;
}

function matchingInterestTags(q: string): string[] {
  const needle = normalizeText(q).trim();
  return INTERESTS.filter(
    (i) => normalizeText(i.label).includes(needle) || needle.includes(normalizeText(i.label)) || i.slug.replace(/-/g, " ") === needle
  ).map((i) => i.slug);
}

interface SearchParamsShape {
  q?: string; near?: string; category?: string; price?: string; attr?: string;
  province?: string; condition?: string; rating?: string; seller?: string; avail?: string;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParamsShape> }) {
  const { q, near, category, price, attr, province, condition, rating, seller, avail } = await searchParams;
  const session = await auth();
  const area = await getSelectedArea();
  const nearOnly = near === "1" && !!area;
  const attrs = (attr ?? "").split(",").filter(Boolean);
  const categories = await getCategoriesWithChildren();

  if (!q) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-4 md:px-6">
        {/* Visually hidden: the SearchBox input is the visual "heading" here by
            design, but the page still needs a real h1 for SEO/screen readers. */}
        <h1 className="sr-only">Search ATBP</h1>
        <SearchBox initialQuery="" />
        <div>
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><TrendingUp size={15} /> Discover something new</h2>
          <div className="flex flex-wrap gap-2">
            {DISCOVERY_SEARCH_COLLECTIONS.map((c) => (
              <Link key={c.slug} href={c.href} className="rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-semibold text-ink-700 hover:border-brand-400 hover:text-brand-600">
                {c.emoji} {c.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-bold text-ink-900">Browse categories</h2>
          <CategoriesMenu categories={categories} />
        </div>
      </div>
    );
  }

  await prisma.searchLog.create({ data: { userId: session?.user?.id, query: q } });

  const { maxPrice, remainder: textQuery } = parseBudget(q);
  const areaQuery = parseAreaQuery(q);
  const interestTags = matchingInterestTags(q);
  const isFoodCategory = isFoodCategorySlug(category, categories);

  const conditions: Record<string, unknown>[] = [
    { status: avail === "all" ? { in: ["ACTIVE", "SOLD_OUT"] } : "ACTIVE" },
  ];
  if (nearOnly) conditions.push({ seller: { province: area! } });
  if (maxPrice) conditions.push({ price: { lte: maxPrice } });
  if (category) {
    const ids = resolveCategoryIds(category, categories);
    if (ids) conditions.push({ categoryId: { in: ids } });
  }
  if (price) {
    const [min, max] = price.split("-").map(Number);
    conditions.push({ price: { gte: min, lte: max } });
  }
  if (condition && !isFoodCategory) conditions.push({ condition });

  const sellerFilter: Record<string, unknown> = {};
  if (!nearOnly && province) sellerFilter.province = province;
  if (rating) sellerFilter.rating = { gte: Number(rating) };

  const attrWhere: Record<string, unknown> = {};
  applyAttributeFilters(attrs, attrWhere, sellerFilter);
  if (Object.keys(attrWhere).length > 0) conditions.push(attrWhere);

  if (Object.keys(sellerFilter).length > 0 || seller) {
    conditions.push({ seller: { ...sellerFilter, ...(seller ? { handle: seller } : {}) } });
  }

  // With free text to fuzzy-match, fetch a wider pool and filter/rank in memory
  // (accent-folding and typo tolerance aren't practical as a Postgres `contains`
  // at this catalog size — see lib/search-text.ts). Without free text, the
  // structured filters alone are selective enough to keep the original small cap.
  const [candidatesRaw, provinceRows, sellerOptionRows] = await Promise.all([
    prisma.product.findMany({
      where: { AND: conditions },
      include: { seller: true, auction: true, category: true },
      orderBy: { createdAt: "desc" },
      take: textQuery ? 500 : 40,
    }),
    prisma.sellerProfile.findMany({ where: { status: "APPROVED", province: { not: null } }, distinct: ["province"], select: { province: true } }),
    prisma.sellerProfile.findMany({ where: { status: "APPROVED" }, select: { handle: true, shopName: true }, orderBy: { shopName: "asc" }, take: 200 }),
  ]);

  const provinces = provinceRows.map((r) => r.province).filter((p): p is string => !!p).sort((a, b) => a.localeCompare(b));

  const candidates = textQuery
    ? candidatesRaw.filter(
        (p) =>
          fuzzyTextMatches(`${p.title} ${p.description} ${p.category?.name ?? ""} ${p.seller.shopName}`, textQuery) ||
          interestTags.some((tag) => (p.tags as string[]).includes(tag))
      )
    : candidatesRaw;

  const needleForRank = textQuery || q;
  const products = [...candidates].sort((a, b) => relevanceRank(a.title, needleForRank) - relevanceRank(b.title, needleForRank)).slice(0, 24);

  // "Categories" facet — a query matching a real category name (e.g. "vintage")
  // gets a direct "browse the whole category" link, not just its products.
  const needleNormalized = normalizeText(q);
  const matchingCategories = categories
    .flatMap((c) => [c, ...c.children])
    .filter((c) => normalizeText(c.name).includes(needleNormalized) && needleNormalized.length >= 3)
    .slice(0, 4);

  // Sellers: name/handle match is fuzzy (accent/typo-tolerant, same as products);
  // "carries what was searched" match (by interest tag or category) stays a
  // direct DB query since it needs to join through their products.
  const sellerTextQuery = !areaQuery && (textQuery || q) ? textQuery || q : null;
  const [nameMatchedSellers, productCarrySellers] = await Promise.all([
    sellerTextQuery
      ? prisma.sellerProfile
          .findMany({ where: { status: "APPROVED", ...(nearOnly ? { province: area! } : {}) }, take: 300 })
          .then((all) => all.filter((s) => fuzzyTextMatches(`${s.shopName} ${s.handle}`, sellerTextQuery)))
      : Promise.resolve([]),
    prisma.sellerProfile.findMany({
      where: {
        status: "APPROVED",
        ...(nearOnly ? { province: area! } : {}),
        OR: areaQuery
          ? [{ province: { contains: areaQuery, mode: "insensitive" } }]
          : [
              ...interestTags.map((tag) => ({ products: { some: { status: "ACTIVE", tags: { array_contains: tag } } } })),
              { products: { some: { status: "ACTIVE", category: { name: { contains: q, mode: "insensitive" } } } } },
            ],
      },
      orderBy: [{ followerCount: "desc" }],
      take: 6,
    }),
  ]);
  const sellerMap = new Map([...productCarrySellers, ...nameMatchedSellers].map((s) => [s.id, s]));
  const sellers = [...sellerMap.values()].slice(0, 6);

  const [drops, events] = await Promise.all([
    prisma.drop.findMany({
      where: { name: { contains: q, mode: "insensitive" }, status: { in: ["UPCOMING", "LIVE"] } },
      include: { seller: true },
      take: 4,
    }),
    prisma.event.findMany({
      where: { name: { contains: q, mode: "insensitive" }, status: { in: ["UPCOMING", "LIVE"] } },
      take: 4,
    }),
  ]);

  const noResults = products.length === 0 && sellers.length === 0 && drops.length === 0 && events.length === 0;
  const trendingIds = products.length ? await getTrendingProductIdSet() : new Set<string>();
  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap(products.map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pt-4 md:px-6">
      <h1 className="sr-only">Search results for &quot;{q}&quot;</h1>
      <SearchBox initialQuery={q} />
      {area && <NearMeToggle area={area} />}
      <SearchFilterBar
        categories={categories.map((c) => ({ slug: c.slug, name: c.name, children: c.children.map((ch) => ({ slug: ch.slug, name: ch.name })) }))}
        sellers={sellerOptionRows}
        provinces={provinces}
      />

      {noResults ? (
        <EmptyState
          icon={SearchIcon}
          title={`No results for "${q}"`}
          description="Try a different keyword or browse Explore instead."
          action={{ href: "/discover", label: "Browse Explore" }}
        />
      ) : (
        <>
          {matchingCategories.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold text-ink-900">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {matchingCategories.map((c) => (
                  <Link key={c.slug} href={`/discover?category=${c.slug}`} className="flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-semibold text-ink-700 hover:border-brand-400 hover:text-brand-600">
                    {c.icon} {c.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {sellers.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold text-ink-900">Sellers</h2>
              <div className="space-y-2">
                {sellers.map((s) => (
                  <Link key={s.id} href={`/seller/${s.handle}`} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3 hover:bg-ink-50">
                    <Avatar>
                      <AvatarImage src={s.logoUrl ?? undefined} />
                      <AvatarFallback>{s.shopName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="flex items-center gap-1 font-bold text-ink-900">
                        {s.shopName} {s.verified && <ShieldCheck size={13} className="text-brand-500" />}
                      </p>
                      <p className="text-xs text-ink-500">@{s.handle}{s.province ? ` · ${s.province}` : ""}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {drops.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><Sparkles size={15} /> Drops</h2>
              <div className="flex flex-wrap gap-2">
                {drops.map((d) => (
                  <Link key={d.id} href={`/drops/${d.id}`} className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-700 hover:border-brand-300">
                    {d.name} <span className="text-xs font-normal text-ink-400">by {d.seller.shopName}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {events.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><CalendarDays size={15} /> Events</h2>
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                {events.map((e) => (
                  <Link key={e.id} href={`/events/${e.id}`} className="relative block h-28 w-40 shrink-0 overflow-hidden rounded-2xl bg-ink-100">
                    <Image src={e.coverImage} alt={e.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 to-transparent" />
                    <p className="absolute inset-x-0 bottom-0 p-2 text-xs font-semibold text-white">{e.name}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {products.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold text-ink-900">Products</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
