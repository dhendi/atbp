import { cachedQuery } from "@/lib/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star, MapPin, Package, Sparkles, Info, CalendarDays, Megaphone, Globe, RotateCcw, Store, Clock, Shirt, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site-url";
import { formatCompactNumber, cn } from "@/lib/utils";
import { getShopStatus, getPublicLocationLabel } from "@/lib/local-shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/domain/product-card";
import { DropCard } from "@/components/domain/drop-card";
import { EmptyState } from "@/components/domain/empty-state";
import { SellerBadgeRow } from "@/components/domain/verified-badge";
import { FoundingSellerBadge } from "@/components/domain/founding-seller-badge";
import { SellerTierBadge } from "@/components/domain/seller-tier-badge";
import { ReportDialog } from "@/components/domain/report-dialog";
import { MakerCard } from "@/components/domain/maker-card";
import { toProductCardData } from "@/lib/product-card-data";
import { getTrendingProductIdSet } from "@/lib/trending";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { getSimilarSellers } from "@/lib/services/discovery";
import { expireOverdueYardSales } from "@/lib/services/yard-sale";
import { enrichReviews } from "@/lib/services/reviews";
import { ReviewCard } from "@/components/domain/review-card";
import { topIdentityInterests } from "@/lib/interests";
import { SellerActions } from "./seller-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const seller = await prisma.sellerProfile.findUnique({ where: { handle } });
  if (!seller || seller.status === "SUSPENDED") return { title: "Shop not found" };

  // The root layout's title template already appends " | ATBP" — don't
  // repeat it here, or the rendered tab title doubles up as "... | ATBP | ATBP".
  const title = `${seller.shopName} (@${seller.handle})`;
  const description = seller.description?.slice(0, 160) ?? `Shop ${seller.shopName} on ATBP.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: seller.bannerUrl ? [{ url: seller.bannerUrl }] : seller.logoUrl ? [{ url: seller.logoUrl }] : [{ url: "/opengraph-image" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: seller.bannerUrl ? [seller.bannerUrl] : seller.logoUrl ? [seller.logoUrl] : undefined,
    },
  };
}

// Everything about a shop's public storefront that's identical for every
// visitor — keyed by sellerId. `isFollowing` is the one thing here that's
// genuinely per-user, so it's fetched separately, outside this cache.
const getSellerStorefrontData = cachedQuery(
  async (sellerId: string) => {
    await expireOverdueYardSales();
    const [products, drops, reviews, upcomingEvents, featuredProducts, closet, activeYardSale] = await Promise.all([
      prisma.product.findMany({ where: { sellerId, status: "ACTIVE" }, include: { auction: true }, orderBy: { createdAt: "desc" } }),
      prisma.drop.findMany({ where: { sellerId }, include: { products: true }, orderBy: { releaseAt: "asc" } }),
      prisma.review.findMany({ where: { sellerId, hidden: false }, include: { buyer: true, product: true }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.eventSeller.findMany({
        where: { sellerId, event: { status: { in: ["UPCOMING", "LIVE"] } } },
        include: { event: true },
        orderBy: { event: { eventDate: "asc" } },
      }),
      prisma.product.findMany({ where: { sellerId, status: "ACTIVE", featured: true }, include: { auction: true } }),
      prisma.closet.findUnique({ where: { sellerId } }),
      prisma.yardSale.findFirst({ where: { sellerId, status: "ACTIVE" } }),
    ]);
    return { products, drops, reviews, upcomingEvents, featuredProducts, closet, activeYardSale };
  },
  ["seller-storefront-data"],
  { revalidate: 60, tags: ["products", "sellers"] }
);

export default async function SellerProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const session = await auth();

  const seller = await prisma.sellerProfile.findUnique({ where: { handle }, include: { hours: true } });
  if (!seller || seller.status === "SUSPENDED") notFound();

  const shopStatus = seller.physicalPresence !== "ONLINE_ONLY" ? getShopStatus(seller.hours, seller.temporarilyClosed) : null;
  const locationLabel = getPublicLocationLabel(seller);
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [storefront, isFollowing, trendingIds, similarSellers] = await Promise.all([
    getSellerStorefrontData(seller.id),
    session?.user
      ? prisma.follow.findUnique({ where: { followerId_sellerId: { followerId: session.user.id, sellerId: seller.id } } })
      : null,
    getTrendingProductIdSet(),
    getSimilarSellers(seller.id, 8),
  ]);
  const { products, drops, reviews, upcomingEvents, featuredProducts, closet, activeYardSale } = storefront;

  const myDropReminders = session?.user
    ? await prisma.dropReminder.findMany({ where: { userId: session.user.id, dropId: { in: drops.map((d) => d.id) } } })
    : [];
  const remindedDropIds = new Set(myDropReminders.map((r) => r.dropId));

  const [savedIds, socialProofMap, enrichedReviews] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap([...products, ...featuredProducts].map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
    // Enriched per-viewer (vote state, respond permission) outside the cached
    // storefront fetch above — that cache is shared across every visitor, so
    // one viewer's vote/permission state can never leak into it.
    enrichReviews(reviews, session?.user?.id),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  const badges = seller.badges as string[];
  const socialLinks = seller.socialLinks as { facebook?: string; instagram?: string; tiktok?: string };

  const sellerUrl = `${getSiteUrl()}/seller/${seller.handle}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl() },
      { "@type": "ListItem", position: 2, name: "Sellers", item: `${getSiteUrl()}/discover` },
      { "@type": "ListItem", position: 3, name: seller.shopName },
    ],
  };

  const isPhysical = seller.physicalPresence !== "ONLINE_ONLY";
  const sellerOrgSchema = {
    "@context": "https://schema.org",
    "@type": isPhysical ? "LocalBusiness" : "Organization",
    name: seller.shopName,
    url: sellerUrl,
    ...(seller.logoUrl && { image: seller.logoUrl }),
    ...(isPhysical
      ? seller.showExactAddress && seller.publicAddress
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: seller.publicAddress,
              ...(seller.province && { addressRegion: seller.province }),
              addressCountry: "PH",
            },
          }
        : seller.province
          ? { areaServed: seller.province }
          : {}
      : {}),
  };

  return (
    <div className="pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sellerOrgSchema).replace(/</g, "\\u003c") }}
      />
      <div className="relative h-36 w-full bg-ink-200 md:h-52">
        {seller.bannerUrl && <Image src={seller.bannerUrl} alt={`${seller.shopName} banner`} fill className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <div className="-mt-10 flex items-end gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-ink-100 shadow-md md:h-24 md:w-24">
            {seller.logoUrl && <Image src={seller.logoUrl} alt={seller.shopName} fill className="object-cover" />}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold text-ink-900">{seller.shopName}</h1>
              {seller.isSampleContent && (
                <span
                  title="This is a sample shop ATBP added to preview the marketplace. It isn't a real seller yet."
                  className="rounded-full bg-gold-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-700"
                >
                  Sample Shop
                </span>
              )}
              {seller.foundingSeller && <FoundingSellerBadge />}
              <SellerTierBadge birVerified={seller.birVerified} />
              {closet && (
                <span className="flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-600">
                  <Shirt size={11} /> Has a Closet
                </span>
              )}
            </div>
            <p className="text-sm text-ink-500">@{seller.handle}</p>
            {locationLabel && (
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {locationLabel}
                </span>
                {shopStatus?.label && (
                  <span className={cn("flex items-center gap-1 font-semibold", shopStatus.isOpen ? "text-live-600" : "text-ink-400")}>
                    <Clock size={12} /> {shopStatus.label}
                  </span>
                )}
                {seller.pickupAvailable && (
                  <span className="flex items-center gap-1 font-semibold text-brand-600">
                    <Store size={12} /> Local pickup available
                  </span>
                )}
              </p>
            )}
            <SellerBadgeRow badges={badges} verified={seller.verified} className="mt-2" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <SellerActions sellerId={seller.id} isFollowing={!!isFollowing} shareUrl={sellerUrl} shopName={seller.shopName} />
            <ReportDialog targetType="SELLER" targetLabel={seller.shopName} />
          </div>
        </div>

        <div className="mt-4 flex gap-6 border-y border-ink-200 py-3 text-sm">
          <Stat label="Rating" value={seller.ratingCount > 0 ? `${seller.rating.toFixed(1)} ★` : "New"} />
          {seller.followerCount > 0 && <Stat label="Followers" value={formatCompactNumber(seller.followerCount)} />}
          <Stat label="Orders completed" value={formatCompactNumber(seller.totalSales)} />
          <Stat label="Listings" value={formatCompactNumber(products.length)} />
        </div>
        {seller.isSampleContent && (
          <p className="mt-1.5 text-[11px] text-ink-400">Seller stats shown are example data for this preview marketplace.</p>
        )}

        {activeYardSale && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-gold-300 bg-gold-50 p-3 text-sm text-ink-800">
            <Tag size={15} className="mt-0.5 shrink-0 text-gold-600" />
            <p>
              🏷️ Live Yard Sale: <span className="font-bold">{activeYardSale.title}</span>, ends{" "}
              {activeYardSale.endDate.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
            </p>
          </div>
        )}

        {seller.announcement && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-gold-300 bg-gold-50 p-3 text-sm text-ink-800">
            <Megaphone size={15} className="mt-0.5 shrink-0 text-gold-600" />
            <p>{seller.announcement}</p>
          </div>
        )}

        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-700">{seller.description}</p>

        {(socialLinks.facebook || socialLinks.instagram || socialLinks.tiktok) && (
          <div className="mt-3 flex flex-wrap gap-3">
            {socialLinks.facebook && (
              <a href={socialLinks.facebook} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-600">
                <Globe size={13} /> Facebook
              </a>
            )}
            {socialLinks.instagram && (
              <a href={socialLinks.instagram} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-600">
                <Globe size={13} /> Instagram
              </a>
            )}
            {socialLinks.tiktok && (
              <a href={socialLinks.tiktok} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-600">
                <Globe size={13} /> TikTok
              </a>
            )}
          </div>
        )}

        {featuredProducts.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><Sparkles size={15} className="text-brand-500" /> Featured</h2>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {featuredProducts.map((p) => (
                <div key={p.id} className="w-[150px] shrink-0">
                  <ProductCard product={toProductCardData({ ...p, seller }, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {upcomingEvents.map(({ event }) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
              >
                <CalendarDays size={12} /> See us at {event.name}
              </Link>
            ))}
          </div>
        )}

        <Tabs defaultValue="products" className="mt-6">
          <TabsList className="no-scrollbar w-full justify-start overflow-x-auto">
            <TabsTrigger value="products"><Package size={14} className="mr-1" /> Products</TabsTrigger>
            <TabsTrigger value="drops"><Sparkles size={14} className="mr-1" /> Drops</TabsTrigger>
            <TabsTrigger value="reviews"><Star size={14} className="mr-1" /> Reviews</TabsTrigger>
            <TabsTrigger value="about"><Info size={14} className="mr-1" /> About</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {products.length === 0 ? (
              <EmptyState icon={Package} title="No products listed yet" />
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={toProductCardData({ ...p, seller }, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="drops">
            {drops.length === 0 ? (
              <EmptyState icon={Sparkles} title="No drops yet" description="Follow this seller to get notified about future limited releases." />
            ) : (
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                {drops.map((d) => (
                  <DropCard
                    key={d.id}
                    drop={{
                      id: d.id, name: d.name, coverImage: d.coverImage, releaseAt: d.releaseAt.toISOString(),
                      seller, quantityAvailable: d.products.reduce((sum, p) => sum + p.quantityAvailable, 0),
                    }}
                    isReminded={remindedDropIds.has(d.id)}
                    loggedIn={!!session?.user}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            {enrichedReviews.length === 0 ? (
              <EmptyState icon={Star} title="No reviews yet" />
            ) : (
              <div className="space-y-3">
                {enrichedReviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={{
                      id: r.id,
                      rating: r.rating,
                      comment: r.comment,
                      photos: r.photos as string[],
                      createdAt: r.createdAt.toISOString(),
                      buyerName: r.buyer.name,
                      buyerReviewCount: r.buyerReviewCount,
                      helpfulCount: r.helpfulCount,
                      notHelpfulCount: r.notHelpfulCount,
                      viewerVote: r.viewerVote,
                      sellerResponse: r.sellerResponse,
                      sellerRespondedAt: r.sellerRespondedAt?.toISOString() ?? null,
                      canRespond: r.canRespond,
                    }}
                    extra={r.product && <span>On: {r.product.title}</span>}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about">
            <div className="space-y-2 text-sm text-ink-700">
              <p>{seller.description}</p>
              {seller.story && <p className="whitespace-pre-line text-ink-600">{seller.story}</p>}
              <p className="text-ink-500">Based in {locationLabel ?? "the Philippines"}.</p>
              <p className="text-ink-500">Member since {seller.createdAt.getFullYear()}.</p>
            </div>

            {seller.physicalPresence !== "ONLINE_ONLY" && (
              <div className="mt-5 rounded-2xl border border-ink-200 p-4">
                <h3 className="mb-2 flex items-center gap-1.5 font-bold text-ink-900"><Clock size={15} className="text-brand-500" /> Store hours</h3>
                {shopStatus?.label && (
                  <p className={cn("mb-2 text-sm font-semibold", shopStatus.isOpen ? "text-live-600" : "text-ink-500")}>{shopStatus.label}</p>
                )}
                {seller.hours.length > 0 ? (
                  <div className="space-y-1 text-sm">
                    {seller.hours
                      .slice()
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map((h) => (
                        <div key={h.dayOfWeek} className="flex justify-between text-ink-600">
                          <span>{DAY_LABELS[h.dayOfWeek]}</span>
                          <span>
                            {h.closed
                              ? "Closed"
                              : h.byAppointment
                              ? "By appointment"
                              : h.open24h
                              ? "Open 24 hours"
                              : `${h.opensAt} - ${h.closesAt}`}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-500">This seller hasn&apos;t listed store hours yet.</p>
                )}
                {seller.pickupAvailable && (
                  <div className="mt-3 border-t border-ink-100 pt-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                      <Store size={14} /> {seller.birVerified ? "Store pickup" : "Local pickup"} available
                    </p>
                    <p className="mt-1 text-sm text-ink-600">
                      {seller.pickupInstructions ?? "Message this seller to arrange a pickup time. Exact details are shared once your order is confirmed."}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-ink-200 p-4">
              <h3 className="mb-1.5 flex items-center gap-1.5 font-bold text-ink-900"><RotateCcw size={15} className="text-brand-500" /> Return policy</h3>
              {seller.returnPolicy ? (
                <p className="whitespace-pre-line text-sm text-ink-600">{seller.returnPolicy}</p>
              ) : (
                <p className="text-sm text-ink-500">This seller hasn&apos;t posted a return policy. Message them directly with any concerns about an order.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {similarSellers.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><Store size={15} className="text-brand-500" /> Similar Sellers</h2>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {similarSellers.map((s) => (
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
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-tag font-bold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}
