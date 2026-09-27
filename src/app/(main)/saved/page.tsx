import { redirect } from "next/navigation";
import { Heart, TrendingDown, AlertTriangle, PackageX } from "lucide-react";
import { auth } from "@/lib/auth";
import { ProductCard } from "@/components/domain/product-card";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { RemoveSavedItemButton } from "./remove-saved-item-button";
import { toProductCardData } from "@/lib/product-card-data";
import { getTrendingProductIdSet } from "@/lib/trending";
import { getWishlistDigest } from "@/lib/services/personalization";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { formatPeso } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/saved");

  const digest = await getWishlistDigest(session.user.id, 100);
  const trendingIds = await getTrendingProductIdSet();
  const socialProofMap = await getSocialProofMap(digest.map((d) => ({ id: d.product.id, quantityAvailable: d.product.quantityAvailable })));

  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader as="h1" eyebrow="Your list" title="Saved" subtitle="Things you've tucked away for later" />
      <div className="px-4 md:px-6">
        {digest.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Nothing saved yet"
            description="Tap the heart on anything you like in Discover to save it here."
            action={{ href: "/discover?sort=newest", label: "Browse New on ATBP" }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
            {digest.map((item) =>
              item.isUnavailable ? (
                <div key={item.savedProductId} className="space-y-1.5">
                  <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-3 text-center">
                    <PackageX size={20} className="text-ink-300" />
                    <p className="line-clamp-2 text-xs font-semibold text-ink-500">{item.product.title}</p>
                    <p className="text-[11px] text-ink-400">No longer available</p>
                  </div>
                  <div className="flex justify-center">
                    <RemoveSavedItemButton productId={item.product.id} />
                  </div>
                </div>
              ) : (
                <div key={item.savedProductId}>
                  <ProductCard
                    product={toProductCardData(item.product, {
                      trending: trendingIds.has(item.product.id),
                      isSaved: true,
                      socialProof: socialProofMap.get(item.product.id),
                    })}
                  />
                  {item.priceDrop && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-live-600">
                      <TrendingDown size={13} /> Price dropped {formatPeso(item.priceDrop)} since you saved it
                    </p>
                  )}
                  {!item.priceDrop && item.isLowStock && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-brand-600">
                      <AlertTriangle size={13} /> Almost gone! Grab it before it sells out
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
