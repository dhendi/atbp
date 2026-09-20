import { cachedQuery } from "@/lib/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star, Truck, MapPin, Package, RotateCcw, Store, Bike, Palette, Download, Sparkles, Search, Archive, CalendarClock, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPeso, formatCompactNumber, estimatedDeliveryRange } from "@/lib/utils";
import { getPublicLocationLabel } from "@/lib/local-shared";
import { productTypeLabel, conditionLabel, conditionDefinition } from "@/lib/constants";
import { isDealActive, discountPercent } from "@/lib/deals";
import { getSiteUrl } from "@/lib/site-url";
import { logProductEvent } from "@/lib/trending";
import { settleExpiredAuctions } from "@/lib/actions/auctions";
import { expireOverdueYardSales } from "@/lib/services/yard-sale";
import { isTawadEligibleListing, expireStaleOffers, TAWAD_MAX_OFFERS_PER_BUYER } from "@/lib/services/tawad";
import { MakeTawadButton } from "./make-tawad-button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SellerBadgeRow } from "@/components/domain/verified-badge";
import { ProductCard } from "@/components/domain/product-card";
import { ReportDialog } from "@/components/domain/report-dialog";
import { toProductCardData } from "@/lib/product-card-data";
import { getTrendingProductIdSet } from "@/lib/trending";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { getFrequentlyBoughtTogether, getMoreFromShop, getRelatedSearchTags } from "@/lib/services/discovery";
import { getInterest } from "@/lib/interests";
import { BundleAddToCart } from "./bundle-add-to-cart";
import { ProductActions } from "./product-actions";
import { RecordViewed } from "./record-viewed";
import { AuctionPanel } from "./auction-panel";
import { DealTimer } from "./deal-timer";
import { ServicePackagePicker } from "./service-package-picker";
import { DigitalProductBuyButton } from "./digital-product-buy-button";

export const dynamic = "force-dynamic";

// The product record itself (and its "more in this category" neighbors) is
// the same for every visitor — session-specific state (follow/save/offers/
// bid status) is layered on separately below and stays uncached. Shared with
// generateMetadata so the two don't each hit Neon for the same row.
const getProductDetail = cachedQuery(
  async (id: string) =>
    prisma.product.findUnique({
      where: { id },
      include: { seller: true, category: true, auction: true, servicePackages: { orderBy: { order: "asc" } } },
    }),
  ["product-detail"],
  { revalidate: 60, tags: ["products"] }
);

const getRelatedProducts = cachedQuery(
  async (categoryId: string, excludeId: string) =>
    prisma.product.findMany({
      where: { categoryId, status: "ACTIVE", id: { not: excludeId } },
      include: { seller: true, auction: true },
      take: 6,
    }),
  ["related-products"],
  { revalidate: 60, tags: ["products"] }
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductDetail(id);
  if (!product) return { title: "Product not found" };

  const images = product.images as string[];
  // The root layout's title template already appends " | ATBP" — don't
  // repeat it here, or the rendered tab title doubles up as "... | ATBP | ATBP".
  const title = `${product.title} | ${product.seller.shopName}`;
  const description = product.description.slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: images[0] ? [{ url: images[0] }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images[0] ? [images[0]] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  await settleExpiredAuctions();
  await expireOverdueYardSales();
  await expireStaleOffers();

  const product = await getProductDetail(id);
  // DRAFT/REMOVED/FLAGGED/PAUSED_CAP/ARCHIVED listings (a flagged prohibited
  // item, an expired Yard Sale item, a paused-cap Closet item, etc.) aren't
  // publicly viewable or buyable — SOLD_OUT still is, same as everywhere else.
  if (!product || (product.status !== "ACTIVE" && product.status !== "SOLD_OUT")) notFound();

  const [closet, yardSale, existingReport] = await Promise.all([
    product.closetId ? prisma.closet.findUnique({ where: { id: product.closetId } }) : null,
    product.yardSaleId ? prisma.yardSale.findUnique({ where: { id: product.yardSaleId } }) : null,
    session?.user
      ? prisma.report.findUnique({ where: { reporterId_productId: { reporterId: session.user.id, productId: product.id } } })
      : null,
  ]);

  await prisma.product.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  await logProductEvent(id, "VIEW", session?.user?.id);

  const [isFollowing, isSaved, related, reviews] = await Promise.all([
    session?.user
      ? prisma.follow.findUnique({ where: { followerId_sellerId: { followerId: session.user.id, sellerId: product.sellerId } } })
      : null,
    session?.user
      ? prisma.savedProduct.findUnique({ where: { userId_productId: { userId: session.user.id, productId: id } } })
      : null,
    getRelatedProducts(product.categoryId, id),
    prisma.review.findMany({ where: { sellerId: product.sellerId, hidden: false }, include: { buyer: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const reviewCount = await prisma.review.count({ where: { sellerId: product.sellerId, hidden: false } });
  const trendingIds = await getTrendingProductIdSet();
  const [relatedSavedIds, relatedSocialProofMap] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap(related.map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const relatedCardOpts = (id: string) => ({ isSaved: relatedSavedIds.has(id), socialProof: relatedSocialProofMap.get(id) });

  const BUDGET_TAGS = ["under-250", "under-500", "under-1000", "under-2500", "worth-the-splurge"];
  const [frequentlyBoughtTogether, moreFromShop, relatedSearchTags] = await Promise.all([
    getFrequentlyBoughtTogether(id, 2),
    getMoreFromShop(product.sellerId, id, 8),
    getRelatedSearchTags(product.tags as string[], BUDGET_TAGS, 8),
  ]);
  // Same user, same full saved-products set as relatedSavedIds above — reuse
  // it instead of re-querying prisma.savedProduct for the identical rows.
  // frequentlyBoughtTogether has no social-proof query of its own — BundleAddToCart
  // below doesn't render social proof, so that data was fetched and never used.
  const moreShopSocialProofMap = await getSocialProofMap(moreFromShop.map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable })));
  const extraSavedIds = relatedSavedIds;

  let isHighestBidder = false;
  if (product.auction && session?.user) {
    const topBid = await prisma.productBid.findFirst({ where: { auctionId: product.auction.id }, orderBy: { amount: "desc" } });
    isHighestBidder = topBid?.userId === session.user.id;
  }

  const tawadAvailable =
    product.tawadEnabled && isTawadEligibleListing(product) && product.status === "ACTIVE" && product.seller.userId !== session?.user?.id;
  const myOffers = tawadAvailable && session?.user
    ? await prisma.offer.findMany({
        where: { productId: product.id, buyerId: session.user.id },
        select: { id: true, amount: true, counterAmount: true, status: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const images = product.images as string[];
  const isPreLovedOrVintage = product.type === "PRE_LOVED" || product.type === "VINTAGE";
  const badges = product.seller.badges as string[];

  const effectivePrice = product.listingType === "AUCTION" && product.auction
    ? product.auction.currentBid
    : isDealActive(product)
      ? (product.dealPrice as number)
      : product.price;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: images,
    category: product.category.name,
    offers: {
      "@type": "Offer",
      url: `${getSiteUrl()}/product/${product.id}`,
      priceCurrency: "PHP",
      price: effectivePrice,
      availability: product.quantityAvailable > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: product.seller.shopName },
    },
    ...(product.seller.ratingCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.seller.rating,
        reviewCount: product.seller.ratingCount,
      },
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category.name,
        item: `${getSiteUrl()}/discover?category=${product.category.slug}`,
      },
      { "@type": "ListItem", position: 3, name: product.title },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-4 md:px-6 md:pb-10 md:pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }}
      />
      <RecordViewed
        id={product.id}
        title={product.title}
        price={product.price}
        image={images[0]}
        handle={product.seller.handle}
        shopName={product.seller.shopName}
      />
      <div className="mx-auto grid max-w-5xl gap-7 md:grid-cols-2">
        <div className="min-w-0">
          <div className="relative aspect-square overflow-hidden rounded-card bg-ink-100">
            <Image src={images[0]} alt={product.title} fill className="object-cover" priority />
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              <Badge variant="subtle">{productTypeLabel(product.type)}</Badge>
              {product.quantity === 1 && product.listingType !== "AUCTION" && <Badge variant="live">One of one</Badge>}
            </div>
          </div>
          {images.length > 1 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((img, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-ink-100">
                  <Image src={img} alt={`${product.title} ${i + 2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
          {product.videoUrl && (
            <div className="relative mt-2 aspect-video overflow-hidden rounded-xl bg-ink-100">
              <video src={product.videoUrl} controls className="h-full w-full object-cover" />
            </div>
          )}
          {isPreLovedOrVintage && (
            <p className="mt-3 text-xs text-ink-500">
              Condition photos are shown above. What you see reflects the item&apos;s actual wear.
            </p>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant="subtle">{product.category.icon} {product.category.name}</Badge>
            {closet && <Badge variant="default" className="bg-ink-700">🧺 From a Closet</Badge>}
            {yardSale && <Badge variant="default" className="bg-gold-600">🏷️ Yard Sale item</Badge>}
            {product.tawadEnabled && <Badge variant="default" className="bg-brand-600">🤝 Tawad: Offers welcome</Badge>}
            {product.listingType === "AUCTION" && (
              <Badge variant="default" className="bg-ink-900">🔨 Auction</Badge>
            )}
            {isDealActive(product) && <Badge variant="brand">{discountPercent(product)}% Off</Badge>}
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 md:text-3xl">{product.title}</h1>
          {yardSale && (
            <p className="mt-1 text-xs font-semibold text-gold-700">
              Part of &ldquo;{yardSale.title}&rdquo;, ends {yardSale.endDate.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
            </p>
          )}

          {product.listingType !== "AUCTION" && (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                {isDealActive(product) ? (
                  <>
                    <span className="text-3xl font-bold tracking-tight text-live-600">{formatPeso(product.dealPrice as number)}</span>
                    <span className="text-ink-400 line-through">{formatPeso(product.price)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold tracking-tight text-ink-900">{formatPeso(product.price)}</span>
                    {product.compareAtPrice && <span className="text-ink-400 line-through">{formatPeso(product.compareAtPrice)}</span>}
                  </>
                )}
              </div>
              {isDealActive(product) && product.dealEndAt && <DealTimer endAt={product.dealEndAt.toISOString()} />}
            </>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {product.kind === "PHYSICAL" && (
              // Deliberately bolder/larger than a standard Badge — condition is
              // a top purchase-decision factor for Pre-Loved/Vintage/Collectible
              // items, so it needs more visual weight than a generic tag, not
              // less. Shown for auctions too: a physical item still has a real
              // condition regardless of how it's sold.
              <span
                className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700"
                title={conditionDefinition(product.condition) ?? undefined}
              >
                {conditionLabel(product.condition)}
              </span>
            )}
            {product.kind === "PHYSICAL" && (
              <span className="flex items-center gap-1 text-ink-500">
                <Package size={13} /> {product.quantityAvailable} available
              </span>
            )}
            <span className="text-ink-400">· {formatCompactNumber(product.viewCount)} views</span>
          </div>

          <Link href={`/seller/${product.seller.handle}`} className="mt-4 flex items-center gap-3 rounded-2xl border border-ink-200 p-3 hover:bg-ink-50">
            <Avatar>
              <AvatarImage src={product.seller.logoUrl ?? undefined} />
              <AvatarFallback>{product.seller.shopName[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink-900">{product.seller.shopName}</p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                <span className="flex items-center gap-1">
                  <Star size={12} className="fill-gold-400 text-gold-400" />
                  {product.seller.ratingCount > 0 ? `${product.seller.rating.toFixed(1)} (${product.seller.ratingCount})` : "New"}
                </span>
                <span>{product.seller.totalSales} orders completed</span>
                <span>Seller since {product.seller.createdAt.getFullYear()}</span>
                {getPublicLocationLabel(product.seller) && (
                  <span className="flex items-center gap-0.5"><MapPin size={11} /> {getPublicLocationLabel(product.seller)}</span>
                )}
              </p>
              <SellerBadgeRow badges={badges} verified={product.seller.verified} className="mt-1.5" />
            </div>
          </Link>
          {product.seller.isSampleContent && (
            <p className="mt-1.5 text-[11px] text-ink-400">Seller stats shown are example data for this preview marketplace.</p>
          )}

          <div className="mt-2 flex justify-end">
            <ReportDialog
              targetType="PRODUCT"
              targetLabel={product.title}
              productId={product.id}
              alreadyReported={!!existingReport}
              triggerLabel="Report this listing"
            />
          </div>

          {product.listingType === "AUCTION" && product.auction ? (
            <AuctionPanel
              data={{
                productId: product.id,
                status: product.auction.status,
                currentBid: product.auction.currentBid,
                startingBid: product.auction.startingBid,
                startAt: product.auction.startAt.toISOString(),
                bidCount: product.auction.bidCount,
                minIncrement: product.auction.minIncrement,
                endAt: product.auction.endAt.toISOString(),
                reservePrice: product.auction.reservePrice,
                reserveMet: product.auction.reserveMet,
                winnerUserId: product.auction.winnerUserId,
                buyNowPrice: product.auction.buyNowPrice,
                hasReserve: !!product.auction.reservePrice,
                isHighestBidder,
                isWinner: product.auction.winnerUserId === session?.user?.id,
                isSeller: product.seller.userId === session?.user?.id,
                loggedIn: !!session?.user,
                isSaved: !!isSaved,
              }}
            />
          ) : product.kind === "SERVICE" ? (
            <ServicePackagePicker
              packages={product.servicePackages.map((p) => ({
                id: p.id, tier: p.tier, price: p.price, deliverables: p.deliverables, deliveryDays: p.deliveryDays, revisionsIncluded: p.revisionsIncluded,
              }))}
              loggedIn={!!session?.user}
              isSeller={product.seller.userId === session?.user?.id}
            />
          ) : product.kind === "DIGITAL_PRODUCT" ? (
            <DigitalProductBuyButton
              productId={product.id}
              price={isDealActive(product) ? (product.dealPrice as number) : product.price}
              loggedIn={!!session?.user}
              isSeller={product.seller.userId === session?.user?.id}
            />
          ) : (
            <ProductActions
              productId={product.id}
              sellerId={product.sellerId}
              quantityAvailable={product.quantityAvailable}
              maxOrderQuantity={product.maxOrderQuantity}
              isFollowing={!!isFollowing}
              isSaved={!!isSaved}
              displayPrice={isDealActive(product) ? (product.dealPrice as number) : product.price}
              compareAtPrice={isDealActive(product) ? product.price : product.compareAtPrice}
              madeToOrder={product.madeToOrder}
              customizationOptions={product.customizationOptions as string[]}
              personalizationInstructions={product.personalizationInstructions}
              shareUrl={`${getSiteUrl()}/product/${product.id}`}
              shareTitle={product.title}
            />
          )}

          {tawadAvailable && (
            <div className="mt-3">
              <MakeTawadButton
                productId={product.id}
                listedPrice={isDealActive(product) ? (product.dealPrice as number) : product.price}
                maxOffers={TAWAD_MAX_OFFERS_PER_BUYER}
                loggedIn={!!session?.user}
                myOffers={myOffers}
              />
            </div>
          )}

          {frequentlyBoughtTogether.length > 0 && product.listingType !== "AUCTION" && product.kind === "PHYSICAL" && (
            <div className="mt-5">
              <BundleAddToCart
                current={{ id: product.id, title: product.title, image: images[0], price: effectivePrice }}
                items={frequentlyBoughtTogether.map((p) => ({
                  id: p.id,
                  title: p.title,
                  image: (p.images as string[])[0],
                  price: isDealActive(p) ? (p.dealPrice as number) : p.price,
                }))}
              />
            </div>
          )}

          {(product.listingType !== "AUCTION" || product.madeToOrder || product.isDigital) && (
            <div className="mt-5 rounded-2xl border border-ink-100 p-3.5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Highlights</p>
              <div className="space-y-2 text-sm">
                {product.kind === "PHYSICAL" && product.listingType !== "AUCTION" && (
                  <div className="flex items-center gap-2 text-ink-600">
                    <Sparkles size={14} className="shrink-0 text-ink-400" />
                    <span>{conditionLabel(product.condition)} · {productTypeLabel(product.type)}</span>
                  </div>
                )}
                {product.madeToOrder && (
                  <div className="flex items-center gap-2 text-ink-600">
                    <Palette size={14} className="shrink-0 text-ink-400" />
                    <span>Made to order{product.productionTimeDays ? `, ready in ~${product.productionTimeDays} day${product.productionTimeDays === 1 ? "" : "s"}` : ""}</span>
                  </div>
                )}
                {product.isDigital && (
                  <div className="flex items-center gap-2 text-ink-600">
                    <Download size={14} className="shrink-0 text-ink-400" />
                    <span>Instant digital download, nothing ships</span>
                  </div>
                )}
                {product.isFood && product.shelfStable && (
                  <div className="flex items-center gap-2 text-ink-600">
                    <Archive size={14} className="shrink-0 text-ink-400" />
                    <span>Shelf-stable, no refrigeration needed</span>
                  </div>
                )}
                {product.isFood && product.expiryInfo && (
                  <div className="flex items-center gap-2 text-ink-600">
                    <CalendarClock size={14} className="shrink-0 text-ink-400" />
                    <span>{product.expiryInfo}</span>
                  </div>
                )}
                {!!product.maxOrderQuantity && (
                  <div className="flex items-center gap-2 text-ink-600">
                    <Package size={14} className="shrink-0 text-ink-400" />
                    <span>Limit {product.maxOrderQuantity} per order</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {product.isFood && (product.ingredients || product.allergens || product.foodShippingNotes) && (
            <div className="mt-5 rounded-2xl border border-ink-100 p-3.5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Food Details</p>
              <div className="space-y-2.5 text-sm text-ink-600">
                {product.ingredients && (
                  <div>
                    <p className="text-xs font-semibold text-ink-800">Ingredients</p>
                    <p className="whitespace-pre-line">{product.ingredients}</p>
                  </div>
                )}
                {product.allergens && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-brand-600" />
                    <p><span className="font-semibold text-ink-800">Allergens: </span>{product.allergens}</p>
                  </div>
                )}
                {product.foodShippingNotes && (
                  <div className="flex items-start gap-2">
                    <Truck size={14} className="mt-0.5 shrink-0 text-ink-400" />
                    <p className="whitespace-pre-line">{product.foodShippingNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3 text-sm">
            <p className="whitespace-pre-line text-ink-700">{product.description}</p>
            {product.shippingAvailable && (
              <div className="flex items-start gap-2 text-ink-500">
                <Truck size={16} className="mt-0.5 shrink-0" />
                <span>
                  Arrives {estimatedDeliveryRange(new Date(), 2, 5)} if ordered today.
                  {product.shippingInfo && ` ${product.shippingInfo}`}
                </span>
              </div>
            )}
            {product.pickupAvailable && product.seller.pickupAvailable && (
              <div className="flex items-start gap-2 text-ink-500">
                <Store size={16} className="mt-0.5 shrink-0" />
                <span>
                  {product.seller.birVerified ? "Store pickup" : "Local pickup"} available{getPublicLocationLabel(product.seller) ? ` in ${getPublicLocationLabel(product.seller)}` : ""}.{" "}
                  {product.seller.pickupInstructions ?? "Exact details are shared once your order is confirmed."}
                </span>
              </div>
            )}
            {product.localDeliveryAvailable && product.seller.localDeliveryAvailable && (
              <div className="flex items-start gap-2 text-ink-500">
                <Bike size={16} className="mt-0.5 shrink-0" />
                <span>
                  Local delivery available in {(product.seller.localDeliveryAreas as string[]).join(", ") || "select areas"}
                  {product.seller.localDeliveryFee ? ` (${formatPeso(product.seller.localDeliveryFee)} delivery fee)` : " (free)"}.
                </span>
              </div>
            )}
            <div className="flex items-start gap-2 text-ink-500">
              <RotateCcw size={16} className="mt-0.5 shrink-0" />
              <span>
                {product.seller.returnPolicy
                  ? <span className="whitespace-pre-line">{product.seller.returnPolicy}</span>
                  : "This seller hasn't posted a return policy. Message them directly with any concerns."}
                {" "}
                <Link href="/buyer-protection" className="font-semibold text-brand-600 hover:underline">
                  See ATBP&apos;s Buyer Protection &amp; Returns policy
                </Link>
                .
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Reviews ({reviewCount})</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-ink-500">No reviews yet for this seller.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const photos = r.photos as string[];
              return (
                <div key={r.id} className="rounded-2xl border border-ink-200 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                      {r.buyer.name}
                      {r.productId === product.id && <Badge variant="subtle">This item</Badge>}
                    </span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13} className={i < r.rating ? "fill-gold-400 text-gold-400" : "text-ink-200"} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-ink-600">{r.comment}</p>}
                  {photos.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {photos.map((url, i) => (
                        <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl bg-ink-100">
                          <Image src={url} alt={`Photo from ${r.buyer.name}'s review, ${i + 1} of ${photos.length}`} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {moreFromShop.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">More from {product.seller.shopName}</h2>
            <Link href={`/seller/${product.seller.handle}`} className="text-sm font-semibold text-brand-600 hover:underline">
              Visit shop
            </Link>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {moreFromShop.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard
                  product={toProductCardData(p, {
                    trending: trendingIds.has(p.id),
                    isSaved: extraSavedIds.has(p.id),
                    socialProof: moreShopSocialProofMap.get(p.id),
                  })}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">You might also like</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={toProductCardData(p, { trending: trendingIds.has(p.id), ...relatedCardOpts(p.id) })} />
            ))}
          </div>
        </section>
      )}

      {relatedSearchTags.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display mb-3 flex items-center gap-1.5 text-lg font-semibold text-ink-900">
            <Search size={17} className="text-ink-400" /> Related searches
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {relatedSearchTags.map((tag) => {
              const interest = getInterest(tag.slug);
              return (
                <Link
                  key={tag.slug}
                  href={`/discover?interest=${tag.slug}`}
                  className="group overflow-hidden rounded-2xl border border-ink-100 hover:border-brand-300"
                >
                  <div className="relative aspect-square bg-ink-100">
                    <Image src={tag.image as string} alt={interest.label} fill className="object-cover transition-transform group-hover:scale-105" />
                  </div>
                  <p className="p-2 text-sm font-semibold text-ink-800">{interest.emoji} {interest.label}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
