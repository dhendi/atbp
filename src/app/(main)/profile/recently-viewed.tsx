"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPeso } from "@/lib/utils";
import { getRecentlyViewed, type RecentlyViewedItem } from "@/lib/recently-viewed";

export function RecentlyViewedSection() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  // Recently-viewed items live in localStorage, which isn't available during SSR —
  // this has to run after mount rather than during render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Recently viewed</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link key={item.id} href={`/product/${item.id}`} className="w-24 shrink-0">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-100">
              <Image src={item.image} alt={item.title} fill className="object-cover" />
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-ink-800">{item.title}</p>
            <p className="font-tag text-xs font-bold text-ink-900">{formatPeso(item.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
