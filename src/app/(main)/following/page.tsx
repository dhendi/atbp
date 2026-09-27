import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Users, ShieldCheck, Sparkles, Gavel, Package, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductCard } from "@/components/domain/product-card";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { toProductCardData } from "@/lib/product-card-data";
import { getTrendingProductIdSet } from "@/lib/trending";
import { getFollowingActivity } from "@/lib/services/following-feed";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";

export const dynamic = "force-dynamic";

// Private, logged-in-only page (redirects anonymous visitors to /login) and
// already disallowed in src/app/robots.ts's DISALLOW list, so it doesn't
// need real SEO investment, just a plain title.
export const metadata: Metadata = { title: "Following" };

const KIND_ICON = { DROP: Sparkles, AUCTION: Gavel, PRODUCT: Package };

export default async function FollowingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/following");

  const follows = await prisma.follow.findMany({ where: { followerId: session.user.id }, include: { seller: true } });
  const sellerIds = follows.map((f) => f.sellerId);

  if (sellerIds.length === 0) {
    return (
      <div className="px-4 pt-8 md:px-6">
        <EmptyState
          icon={Users}
          title="You're not following anyone yet"
          description="Follow sellers you love to see their new products and drops here."
          action={{ href: "/discover", label: "Explore ATBP" }}
        />
      </div>
    );
  }

  const [products, trendingIds, activity] = await Promise.all([
    prisma.product.findMany({ where: { sellerId: { in: sellerIds }, status: "ACTIVE" }, include: { seller: true, auction: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    getTrendingProductIdSet(),
    getFollowingActivity(session.user.id),
  ]);

  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session.user.id),
    getSocialProofMap(products.map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  return (
    <div className="space-y-8 pt-4 md:pt-6">
      <section>
        <SectionHeader as="h1" title="Sellers you follow" />
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-1 md:px-6">
          {follows.map((f) => (
            <Link key={f.id} href={`/seller/${f.seller.handle}`} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
              <Avatar className="h-14 w-14">
                <AvatarImage src={f.seller.logoUrl ?? undefined} />
                <AvatarFallback>{f.seller.shopName[0]}</AvatarFallback>
              </Avatar>
              <span className="line-clamp-1 text-center text-[11px] font-semibold text-ink-700">{f.seller.shopName}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 md:px-6">
        <SectionHeader title="What's new" subtitle="What's happening at the shops you follow" />
        {activity.length === 0 ? (
          <EmptyState icon={Sparkles} title="Nothing new yet" description="Check back later. You'll see new products, auctions, and drops from shops you follow here." />
        ) : (
          <div className="space-y-2">
            {activity.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <Link
                  key={`${item.sellerId}-${item.kind}`}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3 hover:bg-ink-50"
                >
                  <Avatar>
                    <AvatarImage src={item.logoUrl ?? undefined} />
                    <AvatarFallback>{item.shopName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{item.shopName}</p>
                    <p className="flex items-center gap-1 text-xs text-ink-500">
                      <Icon size={12} className={item.kind === "DROP" ? "text-gold-600" : item.kind === "AUCTION" ? "text-live-500" : "text-brand-500"} />
                      {item.label}
                    </p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-ink-300" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="px-4 pb-4 md:px-6">
        <SectionHeader title="New from sellers you follow" />
        {products.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No new products yet" />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
