"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/utils";
import { addToCartAction } from "@/lib/actions/cart";

interface BundleItem {
  id: string;
  title: string;
  image: string;
  price: number;
}

export function BundleAddToCart({ current, items }: { current: BundleItem; items: BundleItem[] }) {
  const all = [current, ...items];
  const [selected, setSelected] = useState<Set<string>>(new Set(all.map((i) => i.id)));
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    if (id === current.id) return; // the current item is always included
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = all.filter((i) => selected.has(i.id)).reduce((sum, i) => sum + i.price, 0);

  async function handleAdd() {
    setLoading(true);
    const toAdd = all.filter((i) => selected.has(i.id));
    const results = await Promise.all(toAdd.map((i) => addToCartAction(i.id)));
    setLoading(false);
    if (results.some((r) => "error" in r)) {
      toast.error("Some items couldn't be added. Check stock and try again.");
      return;
    }
    toast.success(`Added ${toAdd.length} item${toAdd.length === 1 ? "" : "s"} to cart!`);
  }

  return (
    <div className="rounded-2xl border border-ink-200 p-4">
      <p className="mb-3 text-sm font-bold text-ink-900">Frequently bought together</p>
      <div className="space-y-2.5">
        {all.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              disabled={item.id === current.id}
              className="h-4 w-4 shrink-0 accent-brand-500 disabled:opacity-60"
            />
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink-100">
              <Image src={item.image} alt={item.title} fill className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              {item.id === current.id ? (
                <p className="truncate text-sm font-semibold text-ink-900">{item.title} <span className="font-normal text-ink-400">(this item)</span></p>
              ) : (
                <Link href={`/product/${item.id}`} className="truncate text-sm font-semibold text-ink-900 hover:underline">
                  {item.title}
                </Link>
              )}
            </div>
            <span className="text-sm font-bold text-ink-900">{formatPeso(item.price)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
        <div>
          <p className="text-xs text-ink-500">Total for {selected.size} item{selected.size !== 1 ? "s" : ""}</p>
          <p className="text-lg font-extrabold text-ink-900">{formatPeso(total)}</p>
        </div>
        <Button variant="outline" onClick={handleAdd} disabled={loading}>
          <ShoppingBag size={15} /> {loading ? "Adding..." : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
}
