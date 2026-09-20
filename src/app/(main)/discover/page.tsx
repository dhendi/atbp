import type { Metadata } from "next";
import Link from "next/link";
import { Compass, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ProductCard } from "@/components/domain/product-card";
import { EmptyState } from "@/components/domain/empty-state";
import { SectionHeader } from "@/components/domain/section-header";
import { InterestShortcut } from "@/components/domain/interest-shortcut";
import { InterestCollectionCard } from "@/components/domain/interest-collection-card";
import { CollectionCard } from "@/components/domain/collection-card";
import { MakerCard } from "@/components/domain/maker-card";
import { toProductCardData } from "@/lib/product-card-data";
import { getTrendingProducts, getTrendingProductIdSet } from "@/lib/trending";
import { EXPLORE_SHORTCUTS, FEATURED_INTERESTS, GIFT_OCCASIONS, getInterest, topIdentityInterests } from "@/lib/interests";
import { getHiddenGems, getActiveCollections, getUkayFinds, getSulitFinds } from "@/lib/services/discovery";
import { getSelectedArea, getNearbyProducts } from "@/lib/services/local";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { getCategoriesWithChildren, resolveCategoryIds } from "@/lib/categories";
import { getYardSalesNearby, getYardSalesThisWeekend, getTrendingYardSales, getYardSalesEndingSoon } from "@/lib/services/yard-sale";
import { getClosetsNearby, getTrendingClosets, getFeaturedClosets, getClosetsForYou } from "@/lib/services/closet";
import { YardSaleShelfTabs } from "@/components/domain/yard-sale-shelf-tabs";
import { ClosetShelfTabs } from "@/components/domain/closet-shelf-tabs";
import { QuickNav } from "@/components/layout/quick-nav";
import { LAUNCH_HIDDEN_CATEGORY_SLUGS } from "@/lib/feature-flags";
import { FilterBar } from "./filter-bar";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  category?: string;
  province?: string;
  condition?: string;
  type?: string;
  price?: string;
  sort?: string;
  interest?: string;
  attr?: string;
  rating?: string;
  seller?: string;
  avail?: string;
  page?: string;
}

const PAGE_SIZE = 24;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const interest = sp.interest ? getInterest(sp.interest) : null;

  let categoryName: string | null = null;
  if (sp.category) {
    const categories = await getCategoriesWithChildren();
    const match = categories.find((c) => c.slug === sp.category) ?? categories.flatMap((c) => c.children).find((c) => c.slug === sp.category);
    categoryName = match?.name ?? null;
  }

  const title = interest ? `${interest.label} Finds` : categoryName ?? "Explore";
  const description = interest
    ? `Shop ${interest.label.toLowerCase()} finds on ATBP: handmade, vintage, pre-loved, and collectible items from independent sellers across the Philippines.`
    : categoryName
      ? `Browse ${categoryName} listings on ATBP from independent sellers across the Philippines. Filter by price, condition, province, and more.`
      : "Browse handmade, vintage, pre-loved, and collectible finds from independent sellers across the Philippines. Filter by category, interest, price, and more.";

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const session = await auth();
  const categories = await getCategoriesWithChildren();

  const isUnfiltered =
    !sp.q && !sp.category && !sp.province && !sp.type && !sp.condition && !sp.price &&
    !sp.interest && !sp.attr && !sp.rating && !sp.seller && !sp.avail;

  if (isUnfiltered) {
    return <ExploreHome />;
  }

  const sellerFilter: Record<string, unknown> = {};
  if (sp.province) sellerFilter.province = sp.province;
  if (sp.rating) sellerFilter.rating = { gte: Number(sp.rating) };

  const where: Record<string, unknown> = { status: sp.avail === "all" ? { in: ["ACTIVE", "SOLD_OUT"] } : "ACTIVE" };
  if (sp.q) {
    where.OR = [
      { title: { contains: sp.q, mode: "insensitive" } },
      { description: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (sp.category) {
    const ids = resolveCategoryIds(sp.category, categories);
    if (ids) where.categoryId = { in: ids };
  }
  if (sp.type) where.type = sp.type;
  if (sp.condition) where.condition = sp.condition;
  if (sp.price) {
    const [min, max] = sp.price.split("-").map(Number);
    where.price = { gte: min, lte: max };
  }
  if (sp.interest) {
    where.tags = { array_contains: sp.interest };
  }
  const attrs = (sp.attr ?? "").split(",").filter(Boolean);
  if (sp.attr) {
    if (attrs.includes("free-shipping")) where.shippingAvailable = true;
    if (attrs.includes("made-to-order")) where.madeToOrder = true;
    if (attrs.includes("digital")) where.isDigital = true;
    if (attrs.includes("shelf-stable")) where.shelfStable = true;
    if (attrs.includes("local-pickup")) where.pickupAvailable = true;
    if (attrs.includes("on-sale")) {
      const now = new Date();
      where.dealPrice = { not: null };
      where.dealStartAt = { lte: now };
      where.dealEndAt = { gte: now };
    }
    if (attrs.includes("ready-to-ship")) {
      where.madeToOrder = false;
      where.isDigital = false;
    }
    if (attrs.includes("star-sellers") && !sellerFilter.rating) sellerFilter.rating = { gte: 4.5 };
    if (attrs.includes("verified")) sellerFilter.verified = true;
  }
  if (Object.keys(sellerFilter).length > 0 || sp.seller) {
    where.seller = { ...sellerFilter, ...(sp.seller ? { handle: sp.seller } : {}) };
  }

  let orderBy: Record<string, unknown> = { createdAt: "desc" };
  if (sp.sort === "price_asc") orderBy = { price: "asc" };
  else if (sp.sort === "price_desc") orderBy = { price: "desc" };
  else if (sp.sort === "trending") orderBy = { viewCount: "desc" };
  else if (sp.sort === "best_selling") orderBy = { soldCount: "desc" };
  else if (sp.sort === "best_rated") orderBy = { seller: { rating: "desc" } };
  else if (sp.sort === "az") orderBy = { title: "asc" };
  else if (sp.sort === "za") orderBy = { title: "desc" };

  const isOneOfAKind = sp.sort === "one_of_a_kind";
  const page = Math.max(1, Number(sp.page) || 1);

  // one_of_a_kind can only be filtered after fetching (quantity isn't part of
  // `where`), so it fetches a wider pool up front rather than paginating in DB.
  const [products, totalCount] = isOneOfAKind
    ? await (async () => {
        const all = await prisma.product.findMany({ where, include: { seller: true }, orderBy, take: 300 });
        const filtered = all.filter((p) => p.quantity === 1);
        return [filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), filtered.length] as const;
      })()
    : await Promise.all([
        prisma.product.findMany({ where, include: { seller: true }, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
        prisma.product.count({ where }),
      ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Seller dropdown options adapt to the current category/price/search/rating
  // filters (everything except the seller pick itself), so the list is always
  // shops that actually have something matching in view, not the whole site.
  const sellerOptionsWhere = { ...where };
  delete (sellerOptionsWhere as { seller?: unknown }).seller;
  if (Object.keys(sellerFilter).length > 0) sellerOptionsWhere.seller = sellerFilter;
  const sellerOptionRows = await prisma.product.findMany({
    where: sellerOptionsWhere,
    distinct: ["sellerId"],
    select: { seller: { select: { handle: true, shopName: true } } },
    take: 50,
  });
  const sellerOptions = sellerOptionRows.map((r) => r.seller).sort((a, b) => a.shopName.localeCompare(b.shopName));

  const provinceRows = await prisma.sellerProfile.findMany({
    where: { status: "APPROVED", province: { not: null } },
    distinct: ["province"],
    select: { province: true },
  });
  const provinces = provinceRows
    .map((r) => r.province)
    .filter((p): p is string => !!p)
    .sort((a, b) => a.localeCompare(b));

  const interest = sp.interest ? getInterest(sp.interest) : null;
  const trendingIds = await getTrendingProductIdSet(30);
  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap(products.map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader
        as="h1"
        eyebrow="Browse"
        title={interest ? `${interest.emoji ?? ""} ${interest.label}`.trim() : "Explore"}
        subtitle={interest ? `${totalCount} finds on ATBP` : "Everything on ATBP, in one place"}
      />

      <FilterBar
        categories={categories.map((c) => ({ slug: c.slug, name: c.name, children: c.children.map((ch) => ({ slug: ch.slug, name: ch.name })) }))}
        sellers={sellerOptions}
        provinces={provinces}
      />

      <div className="px-4 md:px-6">
        {products.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="Nothing here yet"
            description="Try adjusting your filters or search terms."
            action={{ href: "/discover", label: "Clear Filters" }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((p, i) => (
              <div key={p.id} className={i % 7 === 3 ? "sm:col-span-2 sm:row-span-2" : ""}>
                <ProductCard
                  aspect={i % 7 === 3 ? "aspect-square sm:aspect-[4/5]" : "aspect-[4/5]"}
                  product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })}
                />
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href={pageHref(sp, page - 1)}
              aria-disabled={page <= 1}
              className={`flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none border-ink-100 text-ink-300" : "border-ink-200 text-ink-700 hover:border-brand-300"}`}
            >
              <ChevronLeft size={15} /> Prev
            </Link>
            <span className="text-sm text-ink-500">Page {page} of {totalPages}</span>
            <Link
              href={pageHref(sp, page + 1)}
              aria-disabled={page >= totalPages}
              className={`flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm font-semibold ${page >= totalPages ? "pointer-events-none border-ink-100 text-ink-300" : "border-ink-200 text-ink-700 hover:border-brand-300"}`}
            >
              Next <ChevronRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function pageHref(sp: SearchParams, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "page" || !value) continue;
    params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/discover${qs ? `?${qs}` : ""}`;
}

/** The unfiltered Explore landing — a discovery destination rather than a product
 * grid: interest shortcuts, curated collections, shops, and a handful of
 * data-driven shelves. The dense filterable grid only takes over once someone
 * actually searches or narrows down (see the branch above). */
async function ExploreHome() {
  const session = await auth();
  const area = await getSelectedArea();
  const featuredSlugs = FEATURED_INTERESTS.slice(0, 12);
  // Server Component, not client render — wall-clock time here is correct, not impure.
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const [trending, picks, shops, hiddenGems, justAdded, featuredImages, nearby,
    yardSalesNearby, yardSalesThisWeekend, trendingYardSales, yardSalesEndingSoon,
    closetsForYou, trendingClosets, closetsNearby, staffPickClosets,
    ukayFinds, sulitFinds, categoryTree,
  ] = await Promise.all([
    getTrendingProducts({ limit: 10 }),
    getActiveCollections("PICK"),
    prisma.sellerProfile.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ verified: "desc" }, { followerCount: "desc" }],
      take: 8,
      include: {
        products: { where: { status: "ACTIVE" }, take: 6, orderBy: { createdAt: "desc" } },
        _count: { select: { products: { where: { status: "ACTIVE", createdAt: { gte: sevenDaysAgo } } } } },
      },
    }),
    getHiddenGems(10),
    prisma.product.findMany({ where: { status: "ACTIVE" }, include: { seller: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    Promise.all(
      featuredSlugs.map((slug) => prisma.product.findFirst({ where: { status: "ACTIVE", tags: { array_contains: slug } }, select: { images: true } }))
    ),
    area ? getNearbyProducts(area, 10) : Promise.resolve([]),
    area ? getYardSalesNearby(area, 10) : Promise.resolve([]),
    getYardSalesThisWeekend(10),
    getTrendingYardSales(10),
    getYardSalesEndingSoon(10),
    getClosetsForYou(session?.user?.id, 10),
    getTrendingClosets(10),
    area ? getClosetsNearby(area, 10) : Promise.resolve([]),
    getFeaturedClosets(10),
    getUkayFinds(10),
    getSulitFinds(10),
    getCategoriesWithChildren(),
  ]);
  const trendingIds = await getTrendingProductIdSet(30);
  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap([...trending, ...nearby, ...hiddenGems, ...justAdded, ...ukayFinds, ...sulitFinds].map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  return (
    <div className="space-y-10 pb-10 pt-4 md:space-y-14 md:pt-6">
      <div className="px-4 md:px-6">
        <p className="font-tag mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">Explore</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 md:text-3xl">What are you looking for?</h1>
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {EXPLORE_SHORTCUTS.map((slug) => (
            <InterestShortcut key={slug} slug={slug} />
          ))}
        </div>
      </div>

      {/* ---------- SHOP BY CATEGORY — services/digital-products/food-and-snacks
          are left out of this tile grid for the beta launch, which is scoped
          to Handmade/Pre-loved/Vintage/Collectibles (see feature-flags.ts).
          Each is still fully reachable directly (e.g. /discover?category=
          services) — this only affects what's promoted in primary discovery. ---------- */}
      <section>
        <SectionHeader eyebrow="Browse" title="Shop by Category" subtitle="The full ATBP catalog, organized" />
        <div className="grid grid-cols-3 gap-2.5 px-4 sm:grid-cols-4 md:grid-cols-6 md:px-6">
          {categoryTree.filter((cat) => !LAUNCH_HIDDEN_CATEGORY_SLUGS.has(cat.slug)).map((cat) => (
            <Link
              key={cat.id}
              href={`/discover?category=${cat.slug}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-ink-100 bg-white px-2 py-3.5 text-center transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="text-2xl leading-none">{cat.icon}</span>
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-ink-700">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- SHOP BY INTEREST ---------- */}
      <section>
        <SectionHeader eyebrow="Browse by vibe" title="Shop by Interest" subtitle="Shop by fandom, hobby, or mood" />
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
          {featuredSlugs.map((slug, i) => (
            <InterestCollectionCard key={slug} slug={slug} image={(featuredImages[i]?.images as string[] | undefined)?.[0]} />
          ))}
        </div>
      </section>

      {/* ---------- DISCOVER SELLERS ---------- */}
      <section>
        <SectionHeader eyebrow="Sellers" title="Discover Sellers" subtitle="Small shops, makers, and collectors from around the country" />
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
          {shops.map((s) => (
            <MakerCard
              key={s.id}
              seller={{
                id: s.id, shopName: s.shopName, handle: s.handle, description: s.description,
                logoUrl: s.logoUrl, bannerUrl: s.bannerUrl, province: s.province, followerCount: s.followerCount,
                rating: s.rating, ratingCount: s.ratingCount, badges: s.badges as string[], verified: s.verified,
                previewProducts: s.products.map((p) => ({ id: p.id, image: (p.images as string[])[0] })),
                topInterests: topIdentityInterests(s.products),
                newThisWeek: s._count.products,
              }}
            />
          ))}
        </div>
      </section>

      {/* ---------- SPECIAL FINDS — everything editorial/algorithmic that isn't
          a fixed category or interest: Trending, Picks, Hidden Gems, Ukay,
          Sulit, and Just Added, grouped as one discovery cluster instead of
          six shelves each claiming their own section. Nothing here was
          removed — every one of these is its own sub-shelf, still fully
          browsable. ---------- */}
      <div className="space-y-8">
        <div className="px-4 md:px-6">
          <p className="font-tag text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">More ways to discover</p>
          <h2 className="font-display mt-1 text-xl font-semibold text-ink-900 md:text-2xl">Special Finds</h2>
        </div>

        {/* getTrendingProducts backfills with plain recent listings once real
            signal runs out, so it's never empty — but that filler isn't
            genuinely trending. Only show this section when there's real,
            event-driven demand behind it (see the same fix on the homepage). */}
        {trending.filter((p) => p.trendingScore > 0).length > 0 && (
          <section>
            <SectionHeader eyebrow="🔥 Popular this week" title="Trending Now" seeAllHref="/trending" />
            <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
              {trending.filter((p) => p.trendingScore > 0).map((p) => (
                <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                  <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                </div>
              ))}
            </div>
          </section>
        )}

        {picks.length > 0 && (
          <section>
            <SectionHeader eyebrow="✨ Handpicked" title="ATBP Picks" subtitle="Finds our team thinks are worth a look" seeAllHref="/picks" />
            <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
              {picks.map((pick) => (
                <CollectionCard
                  key={pick.id}
                  href={`/picks/${pick.slug}`}
                  title={pick.title}
                  subtitle={pick.subtitle ?? undefined}
                  emoji={pick.emoji ?? undefined}
                  image={(pick.products[0]?.product.images as string[] | undefined)?.[0]}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader eyebrow="💎 Underrated" title="Hidden Gems" subtitle="Great finds that haven't blown up yet" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {hiddenGems.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>

        {ukayFinds.length > 0 && (
          <section>
            <SectionHeader eyebrow="👕 Thrifted finds" title="Ukay" subtitle="Ukay-ukay, pre-loved fashion finds" />
            <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
              {ukayFinds.map((p) => (
                <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                  <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                </div>
              ))}
            </div>
          </section>
        )}

        {sulitFinds.length > 0 && (
          <section>
            <SectionHeader eyebrow="💰 Great value" title="Sulit Finds" subtitle="Sulit: great value, great price" />
            <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
              {sulitFinds.map((p) => (
                <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                  <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader eyebrow="New" title="Just Added" seeAllHref="/discover?sort=newest" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {justAdded.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---------- SHOP BY OCCASION — Gifts moved off the homepage into its
          own destination (still the same /gifts page, occasion/recipient/
          budget filters and all) rather than a shelf competing at the top. ---------- */}
      <section>
        <SectionHeader eyebrow="🎁 Gift ideas" title="Shop by Occasion" subtitle="Find them something good" seeAllHref="/gifts" />
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 md:px-6">
          {GIFT_OCCASIONS.map((slug) => {
            const occasion = getInterest(slug);
            return (
              <Link
                key={slug}
                href={`/gifts?occasion=${slug}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {occasion.emoji && <span className="text-[15px] leading-none">{occasion.emoji}</span>}
                {occasion.label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- SPECIAL MARKETPLACES — Closets, Yard Sales, Services,
          Markets, and (if enabled) Auctions all live here now instead of on
          the homepage: real, distinct marketplaces, reached from the one
          page whose whole job is "everything at ATBP." ---------- */}
      <div className="space-y-8">
        <div className="px-4 md:px-6">
          <p className="font-tag text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">Distinct marketplaces</p>
          <h2 className="font-display mt-1 text-xl font-semibold text-ink-900 md:text-2xl">Special Marketplaces</h2>
        </div>

        <QuickNav />

        <ClosetShelfTabs forYou={closetsForYou} trending={trendingClosets} nearby={closetsNearby} staffPicks={staffPickClosets} area={area} />

        <YardSaleShelfTabs nearby={yardSalesNearby} thisWeekend={yardSalesThisWeekend} trending={trendingYardSales} endingSoon={yardSalesEndingSoon} area={area} />
      </div>

      {/* ---------- LOCAL — a teaser pointing at the dedicated Local page
          rather than duplicating its whole layout here. ---------- */}
      {nearby.length > 0 && (
        <section>
          <SectionHeader eyebrow="📍 Near You" title={`Local finds in ${area}`} subtitle="Sellers and finds based in your area" seeAllHref="/local" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {nearby.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
