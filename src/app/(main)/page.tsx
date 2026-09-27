import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, Clock, Hammer, Shirt, History, Gem, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { settleExpiredAuctions, notifyStartedAuctions, notifyEndingSoonAuctions } from "@/lib/actions/auctions";
import { getTrendingProducts, getTrendingProductIdSet } from "@/lib/trending";
import { isDealActive, discountPercent } from "@/lib/deals";
import { ProductCard } from "@/components/domain/product-card";
import { MakerCard } from "@/components/domain/maker-card";
import { QuickNav } from "@/components/layout/quick-nav";
import { SectionHeader } from "@/components/domain/section-header";
import { toProductCardData } from "@/lib/product-card-data";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSelectedArea, getNearbySellers, getNearbyProducts } from "@/lib/services/local";
import { getShopStatus } from "@/lib/local-shared";
import { getActivePromotedProducts, logPromotionImpression } from "@/lib/services/promotions";
import { SponsoredProductCard } from "@/components/domain/sponsored-product-card";
import { InterestCollectionCard } from "@/components/domain/interest-collection-card";
import { CollectionCard } from "@/components/domain/collection-card";
import { FEATURED_INTERESTS, topIdentityInterests } from "@/lib/interests";
import { getActiveCollections, getSulitFinds, getUkayFinds } from "@/lib/services/discovery";
import { getFoundingSellerAvailability } from "@/lib/services/founding-seller";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap, type SocialProofData } from "@/lib/services/social-proof";
import { getForYouProducts, getBecauseYouLookedAt, getBasedOnYourSearches, getWishlistDigest, getDealsForYou } from "@/lib/services/personalization";
import { getFirstPurchasePromoState } from "@/lib/services/coupons";
import { FirstPurchasePromo } from "@/components/domain/first-purchase-promo";
import { AUCTIONS_ENABLED } from "@/lib/feature-flags";

// The 4 launch categories (Product.type values) — Services and Snacks &
// Pasalubong used to have tiles here too, but Services is down to a single
// category and both are better discovered via their own destinations
// (QuickNav, category browse) than as peers of these 4 core product types.
const LAUNCH_CATEGORY_TILES = [
  { href: "/discover?type=HANDMADE", label: "Handmade", icon: Hammer, color: "text-brand-700 bg-brand-100" },
  { href: "/discover?type=PRE_LOVED", label: "Pre-Loved", icon: Shirt, color: "text-teal-600 bg-teal-100" },
  { href: "/discover?type=VINTAGE", label: "Vintage", icon: History, color: "text-gold-600 bg-gold-100" },
  { href: "/discover?type=COLLECTIBLE", label: "Collectibles", icon: Gem, color: "text-ink-900 bg-ink-100" },
];

export const dynamic = "force-dynamic";

// Matches src/app/layout.tsx's root title/description exactly, set explicitly
// (via `absolute`, which opts out of the root template) rather than relying
// on the `default` fallback, so the homepage always has its own metadata
// export instead of silently inheriting one from a parent.
const HOME_TITLE = "ATBP — Find something different.";
const HOME_DESCRIPTION =
  "ATBP (at iba pa) is a marketplace for handmade, vintage, pre-loved, and collectible items from independent sellers across the Philippines.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ["/opengraph-image"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export default async function HomePage() {
  const session = await auth();
  await settleExpiredAuctions();
  await notifyStartedAuctions();
  await notifyEndingSoonAuctions();

  const promoState = await getFirstPurchasePromoState(session?.user?.id ?? null);

  // Server Component, not client render — wall-clock time here is correct, not impure.
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const [heroProducts, trending, endingSoonAuctions, dealCandidates, recentlyAdded, makers] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 5 }),
    getTrendingProducts({ limit: 12 }),
    prisma.product.findMany({
      where: { status: "ACTIVE", listingType: "AUCTION", auction: { status: "ACTIVE", startAt: { lte: new Date() } } },
      include: { seller: true, auction: true },
      orderBy: { auction: { endAt: "asc" } },
      take: 10,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", listingType: "FIXED", dealPrice: { not: null } },
      include: { seller: true },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", listingType: "FIXED" },
      include: { seller: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.sellerProfile.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ verified: "desc" }, { followerCount: "desc" }],
      take: 8,
      include: {
        products: { where: { status: "ACTIVE" }, take: 6, orderBy: { createdAt: "desc" } },
        _count: { select: { products: { where: { status: "ACTIVE", createdAt: { gte: sevenDaysAgo } } } } },
      },
    }),
  ]);

  const deals = dealCandidates.filter((p) => isDealActive(p)).sort((a, b) => discountPercent(b) - discountPercent(a)).slice(0, 10);
  const trendingIds = await getTrendingProductIdSet(30);

  let followingIds = new Set<string>();
  if (session?.user) {
    const follows = await prisma.follow.findMany({ where: { followerId: session.user.id } });
    followingIds = new Set(follows.map((f) => f.sellerId));
  }

  const fromFollowedShops = followingIds.size > 0
    ? await prisma.product.findMany({
        where: { sellerId: { in: [...followingIds] }, status: "ACTIVE" },
        include: { seller: true, auction: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  const area = await getSelectedArea();
  const [nearbySellers, nearbyProducts] = area
    ? await Promise.all([getNearbySellers(area, 8), getNearbyProducts(area, 12)])
    : [[], []];

  const featuredSlugs = FEATURED_INTERESTS.slice(0, 10);
  const [sponsoredPromotions, picks, featuredImages, sulitFinds, ukayFinds, foundingAvailability] = await Promise.all([
    getActivePromotedProducts("HOMEPAGE", { limit: 6 }),
    getActiveCollections("PICK"),
    Promise.all(
      featuredSlugs.map((slug) => prisma.product.findFirst({ where: { status: "ACTIVE", tags: { array_contains: slug } }, select: { images: true } }))
    ),
    getSulitFinds(16),
    getUkayFinds(16),
    getFoundingSellerAvailability(),
  ]);
  await Promise.all(sponsoredPromotions.map((p) => logPromotionImpression(p.id)));

  // ---------- Personalization (Parts 4 & 10) — real signals only, simple ranking ----------
  const userId = session?.user?.id;
  const [forYou, becauseYouLookedAt, basedOnSearches, wishlistDigest, dealsForYou] = await Promise.all([
    userId ? getForYouProducts(userId, 12) : Promise.resolve([]),
    userId ? getBecauseYouLookedAt(userId, 12) : Promise.resolve({ source: null, label: null, products: [] }),
    userId ? getBasedOnYourSearches(userId, 12) : Promise.resolve({ terms: [], products: [] }),
    userId ? getWishlistDigest(userId, 10) : Promise.resolve([]),
    userId ? getDealsForYou(userId, 10) : Promise.resolve([]),
  ]);

  // "Trending" only ever means real, event-driven demand — getTrendingProducts
  // backfills with plain recent listings when there isn't enough real signal
  // yet (so /trending and other callers are never empty), but the homepage
  // must not present that filler as trending activity that didn't happen.
  // "New on ATBP" below already covers plain recency honestly.
  const genuinelyTrending = trending.filter((p) => p.trendingScore > 0);

  const allCardProducts = [
    ...trending, ...sulitFinds, ...ukayFinds, ...endingSoonAuctions, ...dealCandidates, ...recentlyAdded, ...nearbyProducts,
    ...fromFollowedShops, ...forYou, ...becauseYouLookedAt.products, ...basedOnSearches.products, ...dealsForYou,
  ];
  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(userId),
    getSocialProofMap(allCardProducts.map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string): { isSaved: boolean; socialProof: SocialProofData | undefined } => ({
    isSaved: savedIds.has(id),
    socialProof: socialProofMap.get(id),
  });

  // One "Deals" shelf, not two stacked ones — personalized deals lead when this
  // user actually has signal, generic top-discount deals otherwise.
  const personalizedDeals = dealsForYou.length > 0;
  const todaysDeals = personalizedDeals ? dealsForYou : deals;

  // The same listing turning up on three shelves in one scroll reads as a
  // thin catalog. Each shelf below takes only products no earlier shelf
  // already showed, in the order they appear on the page.
  const seen = new Set<string>();
  const uniq = <T extends { id: string }>(list: T[], max = 10): T[] => {
    const out = list.filter((p) => !seen.has(p.id)).slice(0, max);
    out.forEach((p) => seen.add(p.id));
    return out;
  };
  const shownTrending = uniq(genuinelyTrending);
  const shownSulit = uniq(sulitFinds);
  const shownUkay = uniq(ukayFinds);
  const shownDeals = uniq(todaysDeals);
  const shownAuctions = uniq(endingSoonAuctions);
  const shownRecent = uniq(recentlyAdded);
  const shownForYou = uniq(forYou);
  const shownBecause = uniq(becauseYouLookedAt.products);
  const shownSearches = uniq(basedOnSearches.products);
  const shownNearby = uniq(nearbyProducts, 12);
  const shownFollowed = uniq(fromFollowedShops);

  return (
    <div className="space-y-16 pb-6 pt-4 md:space-y-24 md:pt-8">
      <FirstPurchasePromo initialStatus={promoState.status} />

      {/* ---------- HERO / SEARCH ---------- */}
      <section className="relative overflow-hidden px-4 md:px-6">
        <div className="weave-texture absolute inset-0 -z-10 opacity-70" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-8">
          <div className="relative z-10">
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl md:text-7xl">
              Everything Filipino, <em className="italic text-brand-600">at iba pa.</em>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-600 md:text-lg">
              Handmade, vintage, pre-loved, and collectible finds from sellers across the Philippines.
            </p>

            <form action="/search" className="mt-6 max-w-md">
              <div className="relative">
                <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  name="q"
                  placeholder="Search products, sellers, or shops"
                  className="h-13 w-full rounded-full border border-ink-200 bg-white pl-11 pr-28 text-sm text-ink-800 shadow-sm placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                />
                <Button type="submit" variant="brand" size="sm" className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2">
                  Search
                </Button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="brand" size="lg" asChild>
                <Link href="/discover">Start exploring <ArrowRight size={17} /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/sell">Sell on ATBP</Link>
              </Button>
            </div>
          </div>

          <div className="relative hidden h-[420px] md:block">
            {heroProducts[0] && (
              <div className="tilt-l absolute left-2 top-0 h-52 w-40 overflow-hidden rounded-card border-4 border-white shadow-xl">
                <Image src={(heroProducts[0].images as string[])[0]} alt={heroProducts[0].title} fill className="object-cover" />
              </div>
            )}
            {heroProducts[1] && (
              <div className="tilt-r absolute left-40 top-16 h-64 w-48 overflow-hidden rounded-card border-4 border-white shadow-xl">
                <Image src={(heroProducts[1].images as string[])[0]} alt={heroProducts[1].title} fill className="object-cover" />
              </div>
            )}
            {heroProducts[2] && (
              <div className="tilt-r-sm absolute right-0 top-0 h-44 w-40 overflow-hidden rounded-card border-4 border-white shadow-xl">
                <Image src={(heroProducts[2].images as string[])[0]} alt={heroProducts[2].title} fill className="object-cover" />
              </div>
            )}
            {heroProducts[3] && (
              <div className="tilt-l-sm absolute bottom-2 right-6 h-56 w-44 overflow-hidden rounded-card border-4 border-white shadow-xl">
                <Image src={(heroProducts[3].images as string[])[0]} alt={heroProducts[3].title} fill className="object-cover" />
              </div>
            )}
            <div className="price-tag tilt-r absolute bottom-16 left-16 z-10 bg-background px-3 py-2 shadow-md">
              <span className="font-tag text-xs font-bold text-ink-800">handmade · one of one</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- QUICK NAV — direct access to Closets/Yard Sales/Services/
          Markets/Auctions, a main feature of ATBP, kept prominent right
          after the hero rather than buried in Explore only. ---------- */}
      <QuickNav />

      {/* ---------- FOUNDING 200 — the main reason for a business to sign up
          now; live spot count, and it disappears once the 200 are gone. ---------- */}
      {!foundingAvailability.full && (
        <section className="px-4 md:px-6">
          <div className="relative overflow-hidden rounded-card border border-amber-300 bg-gradient-to-br from-amber-50 via-amber-50 to-white p-6 md:p-8">
            <div className="paper-grain absolute inset-0" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white">
                <Trophy size={12} /> Founding 200
              </span>
              <h2 className="font-display mt-3 max-w-xl text-2xl font-semibold leading-tight text-ink-900 md:text-3xl">
                Selling a registered business? Be one of our first 200 sellers.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-ink-700 md:text-base">
                Free Pro for 1 year, an 8% commission, then Founding Premium at just ₱999/month.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button asChild variant="gold" size="lg">
                  <Link href="/pricing">See Founding benefits <ArrowRight size={17} /></Link>
                </Button>
                <span className="text-sm font-semibold text-ink-700">
                  {foundingAvailability.remaining} of {foundingAvailability.limit} spots left
                </span>
              </div>
              <p className="mt-3 max-w-xl text-xs text-ink-500">
                For businesses with a BIR Certificate of Registration. Individual and casual sellers are always welcome on ATBP too.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ---------- TRENDING NOW — only shown once real event-driven demand
          exists (see shownTrending above); a brand-new marketplace with
          no signal yet simply skips straight to Shop by Category below,
          rather than showing recent listings mislabeled as trending. ---------- */}
      {shownTrending.length > 0 && (
        <section>
          <SectionHeader eyebrow="🔥 Popular this week" title="Trending on ATBP" subtitle="What people are checking out" seeAllHref="/trending" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {shownTrending.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: true, ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- SHOP BY CATEGORY — the 4 launch categories. Links straight
          into Discover's existing type/category filters, no new backend
          needed. ---------- */}
      <section>
        <SectionHeader eyebrow="Browse" title="Shop by Category" subtitle="Handmade, pre-loved, vintage, and collectibles" />
        <div className="grid grid-cols-2 gap-2.5 px-4 sm:grid-cols-4 md:px-6">
          {LAUNCH_CATEGORY_TILES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-transparent py-5 text-center transition-colors ${cat.color}`}
            >
              <cat.icon size={24} strokeWidth={2.2} />
              <span className="text-xs font-extrabold">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- BROWSE BY VIBE (Featured Interests) — a secondary,
          lighter-weight browsing angle below the primary category tiles ---------- */}
      <section>
        <SectionHeader eyebrow="Browse by vibe" title="Featured Interests" subtitle="Shop by fandom, hobby, or mood" seeAllHref="/discover" />
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
          {featuredSlugs.map((slug, i) => (
            <InterestCollectionCard key={slug} slug={slug} image={(featuredImages[i]?.images as string[] | undefined)?.[0]} />
          ))}
        </div>
      </section>

      {/* ---------- ONE STRONG CURATED SECTION — Filipino Finds is the single
          near-top editorial highlight; ATBP Picks/Hidden Gems (equally
          "curated" but more niche) are demoted further down instead of
          competing with this for top billing. Gifts moved to its own page
          and Explore's "shop by occasion" grouping rather than living here
          too — five near-identical curated shelves back to back was the
          actual complaint this redesign is fixing. ---------- */}
      {/* ---------- SELLERS WORTH FOLLOWING — guarded like every other dynamic
          shelf on this page; there's no static fallback content here, so an
          empty approved-seller pool would otherwise render a header over
          nothing. ---------- */}
      {makers.length > 0 && (
        <section>
          <SectionHeader eyebrow="Sellers" title="Shops to check out" subtitle="Small shops, makers, and collectors from around the country" seeAllHref="/shops" />
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
            {makers.map((m) => (
              <MakerCard
                key={m.id}
                seller={{
                  id: m.id, shopName: m.shopName, handle: m.handle, description: m.description,
                  logoUrl: m.logoUrl, bannerUrl: m.bannerUrl, province: m.province, followerCount: m.followerCount,
                  rating: m.rating, ratingCount: m.ratingCount, badges: m.badges as string[], verified: m.verified,
                  isSampleContent: m.isSampleContent,
                  previewProducts: m.products.map((p) => ({ id: p.id, image: (p.images as string[])[0] })),
                  topInterests: topIdentityInterests(m.products),
                  newThisWeek: m._count.products,
                }}
                isFollowing={followingIds.has(m.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------- SULIT FINDS — good-value picks under ₱500 ---------- */}
      {shownSulit.length > 0 && (
        <section>
          <SectionHeader eyebrow="Sulit" title="Sulit Finds under ₱500" subtitle="Worth every peso" seeAllHref="/discover?interest=under-500" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {shownSulit.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- UKAY — pre-loved clothes and everyday things ---------- */}
      {shownUkay.length > 0 && (
        <section>
          <SectionHeader eyebrow="Ukay" title="Ukay Finds" subtitle="Pre-loved pieces in good shape, for less" seeAllHref="/discover?category=pre-loved" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {shownUkay.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- DEALS (personalized when signal exists, generic top-discount otherwise) ---------- */}
      {shownDeals.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={personalizedDeals ? "🎯 Picked for you" : "🏷️ Limited time"}
            title={personalizedDeals ? "Deals For You" : "Deals today"}
            subtitle={personalizedDeals ? "Discounts on what you actually shop for" : "Good finds, better prices"}
            seeAllHref="/deals"
          />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {shownDeals.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- AUCTIONS ENDING SOON — grouped with Deals: both are
          urgency/value-driven, not general browsing ---------- */}
      {AUCTIONS_ENABLED && shownAuctions.length > 0 && (
        <section>
          <SectionHeader eyebrow="🔨 Bid to win" title="Ending soon" subtitle="Place your bid before time runs out" seeAllHref="/auctions" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {shownAuctions.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- HANDPICKED & HIDDEN GEMS — ATBP Picks (admin-curated
          collections) and Hidden Gems (algorithmic underrated finds) are
          both "editorial discovery," just from different sources, so they
          share one section instead of two ---------- */}
      {picks.length > 0 && (
        <section>
          <SectionHeader eyebrow="✨ Handpicked" title="Handpicked" subtitle="Curated by our team" />
          {picks.length > 0 && (
            <div className="mb-2 px-4 md:px-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">ATBP Picks</p>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
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
            </div>
          )}
        </section>
      )}

      {/* ---------- RECENTLY ADDED — a simple recency shelf, kept small
          rather than competing with the curated sections above. Still
          guarded like the rest: an empty catalog shouldn't render a "Just
          added" header over nothing. ---------- */}
      {shownRecent.length > 0 && (
        <section>
          <SectionHeader eyebrow="New" title="Just added" seeAllHref="/discover?sort=newest" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {shownRecent.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- JUST FOR YOU — every personalized/signal-based shelf
          clustered together near the end instead of scattered through the
          main narrative. A first-time visitor never sees any of this (all
          require a session + real signal); a returning user gets it as a
          bonus zone after the curated homepage, not competing with it. ---------- */}
      {(shownForYou.length > 0 || shownBecause.length > 0 || shownSearches.length > 0 ||
        (area && (nearbySellers.length > 0 || shownNearby.length > 0)) ||
        shownFollowed.length > 0 || wishlistDigest.length > 0 || sponsoredPromotions.length > 0) && (
        <div className="space-y-16 md:space-y-20">
          <SectionHeader eyebrow="👋 Welcome back" title="Just for you" subtitle="Based on what you've viewed, saved, searched, and followed" />

          {shownForYou.length > 0 && (
            <section>
              <SectionHeader eyebrow="✨ Just for you" title="For You" subtitle="Picked based on what you've saved, bought, and followed" />
              <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
                {shownForYou.map((p) => (
                  <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                    <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {shownBecause.length > 0 && (
            <section>
              <SectionHeader
                eyebrow="👀 Following up"
                title={becauseYouLookedAt.label ? `Because you looked at ${becauseYouLookedAt.label}` : "Because you looked at something similar"}
                subtitle="More like what you've recently viewed"
              />
              <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
                {shownBecause.map((p) => (
                  <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                    <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {shownSearches.length > 0 && (
            <section>
              <SectionHeader eyebrow="🔍 From your searches" title="Based on your searches" subtitle={`Related to "${basedOnSearches.terms[0]}" and more`} />
              <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
                {shownSearches.map((p) => (
                  <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                    <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {area && (nearbySellers.length > 0 || shownNearby.length > 0) && (
            <section>
              <SectionHeader eyebrow="📍 Near You" title={`What's near you in ${area}`} subtitle="Sellers and products based in your area" seeAllHref="/local" />

              {nearbySellers.length > 0 && (
                <div className="no-scrollbar mb-5 flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
                  {nearbySellers.map((s) => {
                    const status = s.physicalPresence !== "ONLINE_ONLY" ? getShopStatus(s.hours, s.temporarilyClosed) : null;
                    return (
                      <Link key={s.id} href={`/seller/${s.handle}`} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={s.logoUrl ?? undefined} />
                          <AvatarFallback>{s.shopName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="line-clamp-1 text-[11px] font-semibold text-ink-700">{s.shopName}</span>
                        {status?.label && (
                          <span className={status.isOpen ? "flex items-center gap-0.5 text-[10px] font-semibold text-live-600" : "text-[10px] text-ink-400"}>
                            <Clock size={9} /> {status.isOpen ? "Open" : status.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {shownNearby.length > 0 && (
                <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
                  {shownNearby.map((p) => (
                    <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                      <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {shownFollowed.length > 0 && (
            <section>
              <SectionHeader eyebrow="From shops you follow" title="Back at the market" subtitle="New from the shops you follow" seeAllHref="/following" />
              <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
                {shownFollowed.map((p) => (
                  <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                    <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {wishlistDigest.length > 0 && (
            <section>
              <SectionHeader eyebrow="💌 Saved by you" title="From Your Wishlist" subtitle="Price drops and low-stock alerts on items you've saved" seeAllHref="/saved" />
              <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
                {wishlistDigest.map((item) => (
                  <div key={item.savedProductId} className="w-[168px] shrink-0 md:w-[200px]">
                    <ProductCard product={toProductCardData(item.product, { isSaved: true, socialProof: socialProofMap.get(item.product.id) })} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {sponsoredPromotions.length > 0 && (
            <section>
              <SectionHeader eyebrow="Sponsored" title="Sponsored" subtitle="Paid placements from ATBP sellers" />
              <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
                {sponsoredPromotions.map((promo) => promo.product && (
                  <SponsoredProductCard
                    key={promo.id}
                    data={{
                      promotionId: promo.id,
                      productId: promo.product.id,
                      title: promo.product.title,
                      price: promo.product.price,
                      image: (promo.product.images as string[])[0],
                      shopName: promo.product.seller.shopName,
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ---------- SELLER CTA ---------- */}
      <section className="px-4 md:px-6">
        <div className="relative overflow-hidden rounded-card bg-ink-900 p-7 text-white md:p-12">
          <div className="paper-grain absolute inset-0" />
          <p className="font-tag relative text-[11px] font-bold uppercase tracking-[0.14em] text-brand-300">For sellers</p>
          <h3 className="font-display relative mt-2 max-w-lg text-2xl font-semibold leading-tight md:text-4xl">
            Got something to sell?
          </h3>
          <p className="relative mt-3 max-w-lg text-sm text-white/75 md:text-base">
            {AUCTIONS_ENABLED ? "List your products, run an auction, or put something on sale." : "List your products or put something on sale."}
          </p>
          <Button asChild variant="brand" size="lg" className="relative mt-6">
            <Link href="/sell">Sell on ATBP <ArrowRight size={17} /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
