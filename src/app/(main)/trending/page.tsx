import type { Metadata } from "next";
import Link from "next/link";
import { Flame, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrendingProducts, getRisingFastProducts, getTrendingSellers } from "@/lib/trending";
import { ProductCard } from "@/components/domain/product-card";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { TrendingSellerRow } from "./trending-seller-row";
import { toProductCardData } from "@/lib/product-card-data";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { getCategoriesWithChildren, getLeafCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

const TRENDING_TITLE = "Trending";
const TRENDING_DESCRIPTION =
  "See what's trending on ATBP right now: popular products, rising shops, and the categories buyers are browsing most this week.";

export const metadata: Metadata = {
  title: TRENDING_TITLE,
  description: TRENDING_DESCRIPTION,
  openGraph: { title: TRENDING_TITLE, description: TRENDING_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: TRENDING_TITLE, description: TRENDING_DESCRIPTION },
};

// Ranks categories by total view activity on their active listings — a
// cheap proxy for "what people are browsing right now" that doesn't require
// its own trending-score machinery like products/sellers do.
async function getPopularCategories(limit: number) {
  const [byCategory, topLevel, leaves] = await Promise.all([
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { status: "ACTIVE" },
      _sum: { viewCount: true },
      orderBy: { _sum: { viewCount: "desc" } },
      take: limit,
    }),
    getCategoriesWithChildren(),
    getLeafCategories(),
  ]);
  const info = new Map<string, { name: string; slug: string; icon: string }>();
  for (const c of topLevel) info.set(c.id, { name: c.name, slug: c.slug, icon: c.icon });
  for (const c of leaves) info.set(c.id, { name: c.name, slug: c.slug, icon: c.icon });
  return byCategory.map((row) => info.get(row.categoryId)).filter((c): c is { name: string; slug: string; icon: string } => !!c);
}

export default async function TrendingPage() {
  const session = await auth();
  const [trending, rising, trendingSellers, popularCategories] = await Promise.all([
    getTrendingProducts({ limit: 24 }),
    getRisingFastProducts(10),
    getTrendingSellers(6),
    getPopularCategories(10),
  ]);

  let followingIds = new Set<string>();
  if (session?.user) {
    const follows = await prisma.follow.findMany({ where: { followerId: session.user.id, sellerId: { in: trendingSellers.map((s) => s.id) } } });
    followingIds = new Set(follows.map((f) => f.sellerId));
  }

  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap([...trending, ...rising].map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  // getTrendingProducts backfills with plain recent listings once real signal
  // runs out (so other callers like cart/checkout upsells are never empty) —
  // but this page's whole point is showing genuine trending activity, so it
  // must only show items with a real score. getTrendingSellers has no such
  // fallback to filter out (see its own doc comment).
  const genuinelyTrending = trending.filter((p) => p.trendingScore > 0);

  return (
    <div className="space-y-8 pt-4 md:pt-6">
      <SectionHeader as="h1" eyebrow="🔥 Popular this week" title="Trending" subtitle="What people are checking out right now" />

      {popularCategories.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 md:px-6">
          {popularCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/discover?category=${c.slug}`}
              className="shrink-0 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              {c.icon} {c.name}
            </Link>
          ))}
        </div>
      )}

      {trendingSellers.length > 0 && (
        <section className="px-4 md:px-6">
          <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Trending Shops</h2>
          <div className="space-y-1.5">
            {trendingSellers.map((s, i) => (
              <TrendingSellerRow
                key={s.id}
                rank={i + 1}
                seller={{ id: s.id, shopName: s.shopName, handle: s.handle, logoUrl: s.logoUrl, province: s.province, followerCount: s.followerCount }}
                isFollowing={followingIds.has(s.id)}
              />
            ))}
          </div>
        </section>
      )}

      {rising.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2 px-4 md:px-6">
            <TrendingUp size={16} className="text-live-500" />
            <h2 className="font-display text-lg font-semibold text-ink-900">Rising Fast</h2>
            <span className="text-xs text-ink-500">New and small shops picking up steam</span>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:px-6">
            {rising.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: true, ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 md:px-6">
        <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Trending Now</h2>
        {genuinelyTrending.length === 0 ? (
          <EmptyState
            icon={Flame}
            title="Nothing trending yet"
            description="Trending builds from real activity as buyers browse, save, and buy."
            action={{ href: "/discover?sort=newest", label: "Browse New on ATBP" }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {genuinelyTrending.map((p) => (
              <ProductCard key={p.id} product={toProductCardData(p, { trending: true, ...cardOpts(p.id) })} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
