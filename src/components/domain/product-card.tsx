"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Heart, Flame, Star, ShoppingCart, Check, ShieldCheck, MoreVertical, Flag } from "lucide-react";
import { toast } from "sonner";
import { formatPeso } from "@/lib/utils";
import { conditionLabel, badgeLabel, badgeDescription } from "@/lib/constants";
import { isDealActive, discountPercent } from "@/lib/deals";
import { isPisoFind } from "@/lib/auction-format";
import { toggleSaveProductAction } from "@/lib/actions/social";
import { addToCartAction } from "@/lib/actions/cart";
import { ProductAttributeBadges, type ProductAttributeInput } from "@/components/domain/product-attribute-badges";
import { SocialProofLine } from "@/components/domain/social-proof-line";
import { ReportDialog } from "@/components/domain/report-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { SocialProofData } from "@/lib/services/social-proof";

export interface ProductCardData {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  type?: string;
  condition: string;
  quantity?: number;
  quantityAvailable?: number;
  likeCount: number;
  sellingModes?: string[];
  status?: string;
  listingType?: string; // FIXED | AUCTION
  dealPrice?: number | null;
  dealStartAt?: string | Date | null;
  dealEndAt?: string | Date | null;
  auction?: { currentBid: number; bidCount: number; endAt: string | Date; startAt: string | Date; startingBid: number; status: string } | null;
  trending?: boolean;
  seller: { shopName: string; handle: string; rating?: number; foundingSeller?: boolean; birVerified?: boolean; verified?: boolean; isSampleContent?: boolean };
  isSaved?: boolean;
  socialProof?: SocialProofData;
  shippingAvailable?: boolean;
  pickupAvailable?: boolean;
  isDigital?: boolean;
  madeToOrder?: boolean;
  isFood?: boolean;
  shelfStable?: boolean;
  closetId?: string | null;
  yardSaleId?: string | null;
}

/** How much time is left until `target`, refreshed every 15s — used both for the
 * card's countdown text and to trigger the "ending soon" urgency treatment. */
function useCountdown(target: string | Date) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(target).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setRemainingMs(new Date(target).getTime() - Date.now()), 15000);
    return () => clearInterval(id);
  }, [target]);
  return remainingMs;
}

function formatCountdown(ms: number, suffix: "left" | "" = "left") {
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const core = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m` : "<1m";
  return suffix ? `${core} ${suffix}` : core;
}

export function ProductCard({ product, aspect = "aspect-[4/5]" }: { product: ProductCardData; aspect?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const soldOut = product.status === "SOLD_OUT" || product.quantityAvailable === 0;
  const isAuction = product.listingType === "AUCTION" && !!product.auction;
  const upcoming = isAuction && product.auction!.status === "ACTIVE" && new Date(product.auction!.startAt) > new Date();
  const deal = !isAuction && isDealActive(product);
  const piso = isAuction && isPisoFind(product.auction!);
  const [saved, setSaved] = useState(!!product.isSaved);
  const [pending, startTransition] = useTransition();
  const [addingToCart, startAddingToCart] = useTransition();
  const [addedToCart, setAddedToCart] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const canQuickAdd = !isAuction && !soldOut && product.status !== "DRAFT" && product.status !== "REMOVED";

  // A guest hitting Save/Add-to-Cart mid-discovery shouldn't dead-end on a
  // toast — send them to log in and back to exactly where they were, so the
  // action they started still completes once they're signed in.
  function redirectIfLoggedOut(error: string | undefined) {
    if (error !== "Please log in first.") return false;
    router.push(`/login?callbackUrl=${encodeURIComponent(pathname ?? "/")}`);
    return true;
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (addedToCart) return;
    startAddingToCart(async () => {
      const res = await addToCartAction(product.id, 1);
      if ("error" in res) {
        if (!redirectIfLoggedOut(res.error)) toast.error(res.error);
        return;
      }
      setAddedToCart(true);
      toast.success("Added to cart");
      setTimeout(() => setAddedToCart(false), 2000);
    });
  }

  // Exactly one badge — meaningful states only, most specific wins so cards never stack competing labels.
  const badge = piso
    ? { label: "PISO START", className: "bg-gold-600" }
    : isAuction
      ? { label: "AUCTION", className: "bg-ink-900" }
      : deal
        ? { label: `${discountPercent(product)}% OFF`, className: "bg-brand-500" }
        : product.yardSaleId
          ? { label: "YARD SALE", className: "bg-gold-600" }
          : product.closetId
            ? { label: "CLOSET", className: "bg-ink-700" }
            : product.trending
              ? { label: "TRENDING", className: "bg-live-500", icon: true }
              : null;

  const attributeInput: ProductAttributeInput = {
    shippingAvailable: product.shippingAvailable,
    pickupAvailable: product.pickupAvailable,
    isDigital: product.isDigital,
    madeToOrder: product.madeToOrder,
    isFood: product.isFood,
    shelfStable: product.shelfStable,
  };
  const showAttributeBadge = !isAuction && (product.isDigital || product.madeToOrder || (product.isFood && product.shelfStable));

  return (
    <div className="group relative block">
      {/* Save/cart are siblings of the Link, not descendants — a <button> inside
          an <a> is invalid HTML and can break the anchor during pre-hydration parsing. */}
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
        <button
          aria-label={saved ? "Unsave" : "Save"}
          disabled={pending}
          onClick={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await toggleSaveProductAction(product.id);
              if ("error" in res) {
                if (!redirectIfLoggedOut(res.error)) toast.error(res.error);
                return;
              }
              setSaved(!!res.saved);
            });
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/35"
        >
          <Heart size={15} className={saved ? "fill-live-500 text-live-500" : ""} />
        </button>
        {canQuickAdd && (
          <button
            aria-label={addedToCart ? "Added to cart" : "Add to cart"}
            disabled={addingToCart}
            onClick={handleAddToCart}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/35"
          >
            {addedToCart ? <Check size={15} className="text-live-400" /> : <ShoppingCart size={14} />}
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="More options"
              onClick={(e) => e.preventDefault()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/35"
            >
              <MoreVertical size={15} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setReportOpen(true);
              }}
            >
              <Flag size={14} /> Report this listing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ReportDialog
          targetType="PRODUCT"
          targetLabel={product.title}
          productId={product.id}
          hideTrigger
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      </div>
      <Link href={`/product/${product.id}`} className="block">
        <div className={`relative overflow-hidden rounded-card bg-ink-100 ${aspect} ${!imageLoaded ? "animate-pulse" : ""}`}>
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 280px"
            className={`object-cover transition-[opacity,transform] duration-500 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
          />
          {badge && (
            <span className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${badge.className}`}>
              {badge.icon && <Flame size={10} className="fill-white" />} {badge.label}
            </span>
          )}
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-900/55">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase text-ink-900">Sold Out</span>
            </div>
          )}
        </div>
        <div className="mt-2 space-y-0.5">
          <p className="truncate text-sm font-semibold text-ink-900">{product.title}</p>

          {upcoming ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tracking-tight text-ink-900">{formatPeso(product.auction!.startingBid)}</span>
              <span className="text-xs text-ink-500">starting bid</span>
            </div>
          ) : isAuction ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tracking-tight text-ink-900">{formatPeso(product.auction!.currentBid)}</span>
              <span className="text-xs text-ink-500">current bid</span>
            </div>
          ) : deal ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tracking-tight text-live-600">{formatPeso(product.dealPrice as number)}</span>
              <span className="text-xs text-ink-400 line-through">Was {formatPeso(product.price)}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tracking-tight text-ink-900">{formatPeso(product.price)}</span>
              {product.compareAtPrice && (
                <span className="text-xs text-ink-400 line-through">{formatPeso(product.compareAtPrice)}</span>
              )}
            </div>
          )}

          {isAuction && (upcoming ? <UpcomingMeta startAt={product.auction!.startAt} /> : <LiveAuctionMeta bidCount={product.auction!.bidCount} endAt={product.auction!.endAt} />)}

          {!isAuction && product.condition && product.condition !== "BRAND_NEW" && (
            <p className="text-[11px] font-medium text-ink-400">{conditionLabel(product.condition)}</p>
          )}

          {!isAuction && (product.socialProof || showAttributeBadge) && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-0.5">
              <SocialProofLine data={product.socialProof} max={1} className="flex flex-wrap gap-x-2.5" />
              {showAttributeBadge && <ProductAttributeBadges product={attributeInput} max={1} />}
            </div>
          )}

          <p className="flex items-center gap-1 truncate text-xs text-ink-500">
            {product.seller.shopName}
            {product.seller.isSampleContent && (
              <span
                title="Sample shop shown to preview ATBP before real sellers join"
                className="shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-400"
              >
                Sample
              </span>
            )}
            {product.seller.verified && (
              <span title={`${badgeLabel("VERIFIED_SELLER")}: ${badgeDescription("VERIFIED_SELLER")}`}>
                <ShieldCheck size={11} className="shrink-0 text-teal-600" />
              </span>
            )}
            {product.seller.foundingSeller && <span title="Founding Seller">🏆</span>}
            {product.seller.birVerified && (
              <span title="BIR Certified Business">
                <ShieldCheck size={11} className="shrink-0 text-live-600" />
              </span>
            )}
            {typeof product.seller.rating === "number" && product.seller.rating > 0 && (
              <span className="flex items-center gap-0.5 text-gold-600">
                <Star size={10} className="fill-gold-500 text-gold-500" /> {product.seller.rating.toFixed(1)}
              </span>
            )}
          </p>
        </div>
      </Link>
    </div>
  );
}

function LiveAuctionMeta({ bidCount, endAt }: { bidCount: number; endAt: string | Date }) {
  const remainingMs = useCountdown(endAt);
  const endingSoon = remainingMs > 0 && remainingMs < 3600000;
  return (
    <p className={`text-xs ${endingSoon ? "font-bold text-live-600" : "text-ink-500"}`}>
      {bidCount} {bidCount === 1 ? "bid" : "bids"} · {formatCountdown(remainingMs)}
    </p>
  );
}

function UpcomingMeta({ startAt }: { startAt: string | Date }) {
  const remainingMs = useCountdown(startAt);
  return <p className="text-xs text-ink-500">Starts in {formatCountdown(remainingMs, "")}</p>;
}
