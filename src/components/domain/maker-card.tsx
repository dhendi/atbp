"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MapPin, Star, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatCompactNumber, initials } from "@/lib/utils";
import { toggleFollowAction } from "@/lib/actions/live";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SellerBadgeRow } from "@/components/domain/verified-badge";
import { getInterest } from "@/lib/interests";

export interface MakerCardData {
  id: string;
  shopName: string;
  handle: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl?: string | null;
  province: string | null;
  followerCount: number;
  rating?: number;
  ratingCount?: number;
  badges?: string[];
  verified?: boolean;
  isSampleContent?: boolean;
  previewProducts?: { id: string; image: string }[];
  topInterests?: string[];
  newThisWeek?: number;
}

function rotate<T>(arr: T[], offset: number, count: number): T[] {
  const n = arr.length;
  if (n === 0) return [];
  return Array.from({ length: Math.min(count, n) }, (_, i) => arr[(offset + i) % n]);
}

/** A seller's "booth" on ATBP — banner, logo, a taste of what they sell, and a way to follow or visit, all in one card.
 *  On hover (pointer devices only), it lifts slightly and the preview shelf cycles through more of the shop's items —
 *  a small nod to "peeking into the booth" rather than a static thumbnail. */
export function MakerCard({ seller, isFollowing = false, fluid = false }: { seller: MakerCardData; isFollowing?: boolean; /** Fill the grid cell instead of the fixed carousel width. */ fluid?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(isFollowing);
  const [pending, startTransition] = useTransition();
  const [hovered, setHovered] = useState(false);
  const [previewOffset, setPreviewOffset] = useState(0);

  const previewProducts = seller.previewProducts ?? [];
  const canCycle = previewProducts.length > 3;

  // Reset the cycle position right during render (rather than in an effect) when
  // hover state stops being eligible to cycle.
  const [prevCycling, setPrevCycling] = useState(hovered && canCycle);
  const cycling = hovered && canCycle;
  if (cycling !== prevCycling) {
    setPrevCycling(cycling);
    if (!cycling) setPreviewOffset(0);
  }

  useEffect(() => {
    if (!cycling) return;
    const id = setInterval(() => setPreviewOffset((i) => (i + 1) % previewProducts.length), 900);
    return () => clearInterval(id);
  }, [cycling, previewProducts.length]);

  const visibleProducts = rotate(previewProducts, previewOffset, 3);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative ${fluid ? "w-full" : "w-[260px] shrink-0 md:w-[280px]"} overflow-hidden rounded-card border border-ink-200 bg-white transition-all duration-300 hover:z-10 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl`}
    >
      <Link href={`/seller/${seller.handle}`} className="block">
        <div className="relative h-16 w-full bg-ink-100">
          {seller.bannerUrl && <Image src={seller.bannerUrl} alt="" fill className="object-cover" />}
        </div>
        <div className="px-4">
          <div className="-mt-7 h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-ink-100 shadow-sm">
            <Avatar className="h-full w-full rounded-none">
              <AvatarImage src={seller.logoUrl ?? undefined} />
              <AvatarFallback className="rounded-none">{initials(seller.shopName)}</AvatarFallback>
            </Avatar>
          </div>
          <p className="mt-2 flex items-center gap-1.5 truncate font-display text-base font-semibold text-ink-900">
            {seller.shopName}
            {seller.isSampleContent && (
              <span
                title="Sample shop shown to preview ATBP before real sellers join"
                className="shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-400"
              >
                Sample
              </span>
            )}
          </p>
          <p className="truncate text-xs text-ink-400">@{seller.handle}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
            {seller.province && (
              <span className="flex items-center gap-0.5"><MapPin size={11} /> {seller.province}</span>
            )}
            {typeof seller.rating === "number" && seller.rating > 0 && (
              <span className="flex items-center gap-0.5 text-gold-600">
                <Star size={11} className="fill-gold-500 text-gold-500" /> {seller.rating.toFixed(1)}
                {typeof seller.ratingCount === "number" && seller.ratingCount > 0 && ` (${seller.ratingCount})`}
              </span>
            )}
            {seller.followerCount > 0 && <span>{formatCompactNumber(seller.followerCount)} followers</span>}
          </p>
          {seller.topInterests && seller.topInterests.length > 0 && (
            <p className="mt-1 truncate text-xs font-medium text-ink-500">
              {seller.topInterests.map((slug) => getInterest(slug).label).join(" · ")}
            </p>
          )}
          {seller.badges && seller.badges.length > 0 && (
            <SellerBadgeRow badges={seller.badges} verified={!!seller.verified} className="mt-1.5" max={2} />
          )}
        </div>
      </Link>

      {seller.description && (
        <p className="mt-2 line-clamp-2 px-4 text-sm text-ink-600">{seller.description}</p>
      )}
      {!!seller.newThisWeek && (
        <p className="mt-2 flex items-center gap-1 px-4 text-xs font-semibold text-brand-600">
          <Sparkles size={11} /> {seller.newThisWeek} new item{seller.newThisWeek === 1 ? "" : "s"} this week
        </p>
      )}

      {visibleProducts.length > 0 && (
        <div className="mt-3 flex gap-1.5 px-4">
          {visibleProducts.map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              href={`/product/${p.id}`}
              className="relative aspect-square w-1/3 overflow-hidden rounded-lg bg-ink-100"
            >
              <Image src={p.image} alt="" fill className="object-cover transition-opacity duration-300" />
            </Link>
          ))}
        </div>
      )}
      {canCycle && (
        <div className="mt-1.5 flex justify-center gap-1 px-4">
          {previewProducts.map((_, i) => (
            <span key={i} className={`h-1 w-1 rounded-full transition-colors ${i === previewOffset ? "bg-brand-500" : "bg-ink-200"}`} />
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 px-4 pb-4">
        <Button size="sm" variant="outline" asChild>
          <Link href={`/seller/${seller.handle}`}>Visit Shop</Link>
        </Button>
        <Button
          size="sm"
          variant={following ? "subtle" : "brand"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await toggleFollowAction(seller.id);
              if ("error" in res) {
                if (res.error === "Please log in first.") {
                  router.push(`/login?callbackUrl=${encodeURIComponent(pathname ?? "/")}`);
                  return;
                }
                toast.error(res.error);
                return;
              }
              setFollowing(!!res.following);
            })
          }
        >
          {following ? "Following" : "Follow"}
        </Button>
      </div>
    </div>
  );
}
