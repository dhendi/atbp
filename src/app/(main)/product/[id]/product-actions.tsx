"use client";

import { track } from "@/lib/analytics-client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, ShoppingBag, Zap, Minus, Plus, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addToCartAction } from "@/lib/actions/cart";
import { buyNowAction, toggleFollowAction } from "@/lib/actions/live";
import { toggleSaveProductAction } from "@/lib/actions/social";
import { AddToCollectionButton } from "@/components/domain/add-to-collection-button";
import { ShareButton } from "@/components/domain/share-button";
import { formatPeso } from "@/lib/utils";

export function ProductActions({
  productId, sellerId, quantityAvailable, maxOrderQuantity, isFollowing: initialFollowing, isSaved: initialSaved, displayPrice, compareAtPrice,
  madeToOrder, customizationOptions, personalizationInstructions, shareUrl, shareTitle,
}: {
  productId: string;
  sellerId: string;
  quantityAvailable: number;
  maxOrderQuantity?: number | null;
  isFollowing: boolean;
  isSaved: boolean;
  displayPrice: number;
  compareAtPrice?: number | null;
  madeToOrder?: boolean;
  customizationOptions?: string[];
  personalizationInstructions?: string | null;
  shareUrl: string;
  shareTitle: string;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const soldOut = quantityAvailable <= 0;
  const maxQty = Math.max(1, Math.min(quantityAvailable, maxOrderQuantity ?? quantityAvailable));
  const [qty, setQty] = useState(1);

  const options = customizationOptions ?? [];
  const [optionValues, setOptionValues] = useState<Record<string, string>>({});
  const [personalizationNote, setPersonalizationNote] = useState("");
  const hasCustomization = !!madeToOrder && (options.length > 0 || !!personalizationInstructions);

  function composeNote(): string | undefined {
    if (!hasCustomization) return undefined;
    const parts = options
      .map((opt) => (optionValues[opt]?.trim() ? `${opt}: ${optionValues[opt].trim()}` : null))
      .filter((v): v is string => !!v);
    if (personalizationNote.trim()) parts.push(`Note: ${personalizationNote.trim()}`);
    return parts.length > 0 ? parts.join("; ") : undefined;
  }

  function validateCustomization(): boolean {
    if (!hasCustomization) return true;
    const missing = options.filter((opt) => !optionValues[opt]?.trim());
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(", ")}`);
      return false;
    }
    return true;
  }

  function handleBuyNow() {
    if (!validateCustomization()) return;
    startTransition(async () => {
      const res = await buyNowAction(productId, qty, composeNote());
      if ("error" in res) {
        // Logged out — send them to the guest checkout entry point rather
        // than just erroring; account creation was never required to buy.
        if (res.error === "Please log in first.") {
          router.push(`/checkout?guest=${productId}&qty=${qty}`);
          return;
        }
        toast.error(res.error);
        return;
      }
      router.push(`/checkout?item=${res.cartItemId}`);
    });
  }

  function handleAddToCart() {
    if (!validateCustomization()) return;
    startTransition(async () => {
      const res = await addToCartAction(productId, qty, composeNote());
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      track("add_to_cart", { product_id: productId, quantity: qty });
      toast.success(`Added ${qty} to cart!`);
    });
  }

  function handleFollow() {
    startTransition(async () => {
      const res = await toggleFollowAction(sellerId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setFollowing(!!res.following);
    });
  }

  function handleSave() {
    startTransition(async () => {
      const res = await toggleSaveProductAction(productId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setSaved(!!res.saved);
    });
  }

  return (
    <>
      {!soldOut && hasCustomization && (
        <div className="mt-4 space-y-3 rounded-2xl border border-ink-200 p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
            <Palette size={15} className="text-brand-600" /> Options & Personalization
          </p>
          {options.map((opt) => (
            <div key={opt} className="space-y-1">
              <Label>{opt}</Label>
              <Input
                value={optionValues[opt] ?? ""}
                onChange={(e) => setOptionValues((prev) => ({ ...prev, [opt]: e.target.value }))}
                placeholder={`Tell the seller your ${opt.toLowerCase()}`}
              />
            </div>
          ))}
          {personalizationInstructions && (
            <div className="space-y-1">
              <Label>Personalization</Label>
              <p className="text-xs text-ink-500">{personalizationInstructions}</p>
              <Textarea
                value={personalizationNote}
                onChange={(e) => setPersonalizationNote(e.target.value)}
                placeholder="Add the text, name, or details for your personalization"
              />
            </div>
          )}
        </div>
      )}

      {!soldOut && maxQty > 1 && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-700">Quantity</span>
          <div className="flex items-center gap-1 rounded-full border border-ink-200 px-1">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="flex h-8 w-8 items-center justify-center text-ink-500 disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-bold text-ink-900">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="flex h-8 w-8 items-center justify-center text-ink-500 disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
          <span className="text-xs text-ink-400">{quantityAvailable} available</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="brand" className="flex-1" onClick={handleBuyNow} disabled={pending || soldOut}>
          <Zap size={16} /> {soldOut ? "Sold Out" : "Buy Now"}
        </Button>
        <Button variant="outline" onClick={handleAddToCart} disabled={pending || soldOut}>
          <ShoppingBag size={16} /> Add to Cart
        </Button>
        <Button variant="outline" onClick={handleSave} disabled={pending} aria-label={saved ? "Remove from saved" : "Save item"}>
          <Heart size={16} className={saved ? "fill-live-500 text-live-500 transition-transform scale-110" : "transition-transform"} />
        </Button>
        <AddToCollectionButton item={{ productId }} iconOnly />
        <ShareButton url={shareUrl} title={shareTitle} />
        <Button variant={following ? "subtle" : "outline"} onClick={handleFollow} disabled={pending} className="w-full">
          {following ? "Following Seller" : "Follow Seller"}
        </Button>
      </div>

      {/* Mobile-only sticky purchase bar — keeps the primary action reachable while
          scrolling through description/reviews/related products further down the page. */}
      <div className="fixed inset-x-0 bottom-16 z-30 flex items-center gap-3 border-t border-ink-200 bg-white px-4 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] md:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-ink-500">Price</p>
          <p className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tracking-tight text-ink-900">{formatPeso(displayPrice)}</span>
            {compareAtPrice && <span className="text-xs text-ink-400 line-through">{formatPeso(compareAtPrice)}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddToCart} disabled={pending || soldOut} className="shrink-0">
          <ShoppingBag size={16} /> Add
        </Button>
        <Button variant="brand" size="sm" className="shrink-0" onClick={handleBuyNow} disabled={pending || soldOut}>
          <Zap size={15} /> {soldOut ? "Sold Out" : "Buy Now"}
        </Button>
      </div>
    </>
  );
}
