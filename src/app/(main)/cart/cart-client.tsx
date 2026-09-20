"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPeso } from "@/lib/utils";
import { removeCartItemAction, updateCartItemQuantityAction, saveCartItemForLaterAction, moveSavedToCartAction } from "@/lib/actions/cart";
import { cancelReservedItemAction } from "@/lib/actions/live";

interface CartItemData {
  id: string;
  quantity: number;
  unitPrice: number;
  sourceType: string;
  product: { id: string; title: string; images: string[]; quantityAvailable: number };
  seller: { shopName: string; handle: string };
}

interface SavedForLaterItem {
  productId: string;
  title: string;
  image: string;
  price: number;
  seller: { shopName: string; handle: string };
}

export function CartClient({ items: initialItems, savedForLater: initialSaved }: { items: CartItemData[]; savedForLater: SavedForLaterItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [savedForLater, setSavedForLater] = useState(initialSaved);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialItems.map((i) => i.id)));
  const [, startTransition] = useTransition();

  // router.refresh() re-renders the server parent with fresh data, but a mounted
  // client component doesn't re-run its useState initializer — adjust state right
  // during render (React's recommended pattern) so "Move to cart" (which needs a
  // real server-issued cart item id) shows up without an extra effect-driven render.
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
    setSelected(new Set(initialItems.map((i) => i.id)));
  }
  const [prevInitialSaved, setPrevInitialSaved] = useState(initialSaved);
  if (initialSaved !== prevInitialSaved) {
    setPrevInitialSaved(initialSaved);
    setSavedForLater(initialSaved);
  }

  const total = useMemo(
    () => items.filter((i) => selected.has(i.id)).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [items, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateQty(id: string, qty: number) {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
    startTransition(() => {
      updateCartItemQuantityAction(id, qty);
    });
  }

  function removeItem(id: string, sourceType: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    startTransition(async () => {
      if (sourceType === "BUY_NOW") await cancelReservedItemAction(id);
      else await removeCartItemAction(id);
      toast.success("Removed from cart");
    });
  }

  function saveForLater(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSavedForLater((prev) => [
      { productId: item.product.id, title: item.product.title, image: item.product.images[0], price: item.unitPrice, seller: item.seller },
      ...prev,
    ]);
    startTransition(async () => {
      const res = await saveCartItemForLaterAction(id);
      if (res && "error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved for later");
    });
  }

  function moveToCart(productId: string) {
    setMovingId(productId);
    setSavedForLater((prev) => prev.filter((s) => s.productId !== productId));
    startTransition(async () => {
      const res = await moveSavedToCartAction(productId);
      setMovingId(null);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Moved to cart");
      router.refresh();
    });
  }

  function checkout() {
    if (selected.size === 0) return toast.error("Select at least one item.");
    router.push(`/checkout?items=${Array.from(selected).join(",")}`);
  }

  const badgeLabel: Record<string, string> = { CLAIM: "Claimed", AUCTION: "Auction win", BUY_NOW: "Reserved", MARKETPLACE: "" };

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3 rounded-card border border-ink-100 bg-white p-3">
          <input
            type="checkbox"
            checked={selected.has(item.id)}
            onChange={() => toggle(item.id)}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-500"
          />
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-100">
            <Image src={item.product.images[0]} alt={item.product.title} fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/product/${item.product.id}`} className="line-clamp-1 text-sm font-bold text-ink-900 hover:underline">
                  {item.product.title}
                </Link>
                <p className="text-xs text-ink-500">{item.seller.shopName}</p>
              </div>
              <button
                onClick={() => removeItem(item.id, item.sourceType)}
                aria-label={`Remove ${item.product.title} from cart`}
                className="flex h-9 w-9 shrink-0 items-center justify-center text-ink-400 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
            {badgeLabel[item.sourceType] && (
              <Badge variant="subtle" className="mt-1">
                {badgeLabel[item.sourceType]}
              </Badge>
            )}
            {item.sourceType === "MARKETPLACE" && (
              <button
                onClick={() => saveForLater(item.id)}
                className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink-400 hover:text-brand-600"
              >
                <Heart size={11} /> Save for later
              </button>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="font-extrabold text-ink-900">{formatPeso(item.unitPrice)}</span>
              {item.sourceType === "MARKETPLACE" ? (
                <div className="flex items-center gap-2 rounded-full border border-ink-200 px-1">
                  <button
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                    aria-label={`Decrease quantity of ${item.product.title}`}
                    className="flex h-9 w-9 items-center justify-center text-ink-500"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.quantityAvailable}
                    aria-label={`Increase quantity of ${item.product.title}`}
                    className="flex h-9 w-9 items-center justify-center text-ink-500 disabled:opacity-30"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-ink-400">Qty {item.quantity}</span>
              )}
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && savedForLater.length > 0 && (
        <p className="rounded-card border border-dashed border-ink-200 p-4 text-center text-sm text-ink-500">
          Your cart is empty. Move something back from Saved for later below.
        </p>
      )}

      {savedForLater.length > 0 && (
        <div className="pt-2">
          <h2 className="mb-2 text-sm font-bold text-ink-900">Saved for later ({savedForLater.length})</h2>
          <div className="space-y-3">
            {savedForLater.map((s) => (
              <div key={s.productId} className="flex gap-3 rounded-card border border-ink-100 bg-white p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                  <Image src={s.image} alt={s.title} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${s.productId}`} className="line-clamp-1 text-sm font-bold text-ink-900 hover:underline">
                    {s.title}
                  </Link>
                  <p className="text-xs text-ink-500">{s.seller.shopName}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="font-extrabold text-ink-900">{formatPeso(s.price)}</span>
                    <Button size="sm" variant="outline" disabled={movingId === s.productId} onClick={() => moveToCart(s.productId)}>
                      {movingId === s.productId ? "Moving..." : "Move to cart"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="sticky bottom-20 mt-4 rounded-card border border-ink-100 bg-white p-4 shadow-lg md:bottom-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-500">Subtotal ({selected.size} item{selected.size !== 1 ? "s" : ""})</span>
            <span className="text-xl font-extrabold text-ink-900">{formatPeso(total)}</span>
          </div>
          <Button variant="brand" size="lg" className="w-full" onClick={checkout}>
            Checkout
          </Button>
        </div>
      )}
    </div>
  );
}
