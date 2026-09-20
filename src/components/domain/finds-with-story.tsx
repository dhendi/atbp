"use client";

import { useState } from "react";
import { Shirt, Tent, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClosetCard, type ClosetCardData } from "@/components/domain/closet-card";
import { YardSaleCard, type YardSaleCardData } from "@/components/domain/yard-sale-card";
import { ProductCard, type ProductCardData } from "@/components/domain/product-card";

/** Replaces three previously-separate homepage shelves (Closets, Yard Sales,
 * and — new — a general Pre-Loved shelf) with one tabbed section. Same
 * underlying data (getFeaturedClosets / getTrendingYardSales / getUkayFinds),
 * just presented as one destination instead of three competing ones —
 * nothing about the closet/yard-sale features themselves changed, they're
 * still fully browsable at /closets and /yard-sales via "See all". */
export function FindsWithStory({
  closets, yardSales, preLoved,
}: { closets: ClosetCardData[]; yardSales: YardSaleCardData[]; preLoved: ProductCardData[] }) {
  const tabs = [
    { id: "closets" as const, label: "Closets", icon: Shirt, count: closets.length, seeAllHref: "/closets" },
    { id: "yard-sales" as const, label: "Yard Sales", icon: Tent, count: yardSales.length, seeAllHref: "/yard-sales" },
    { id: "pre-loved" as const, label: "Pre-Loved", icon: Sparkles, count: preLoved.length, seeAllHref: "/discover?condition=LIKE_NEW,GOOD,FAIR" },
  ].filter((t) => t.count > 0);

  const [active, setActive] = useState(tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!activeTab) return null;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6">
        <div>
          <p className="font-tag text-[11px] font-bold uppercase tracking-[0.12em] text-brand-600">🧵 Pre-loved, sold personally</p>
          <h2 className="font-display mt-1 text-xl font-semibold text-ink-900 md:text-2xl">Finds With a Story</h2>
        </div>
        <a href={activeTab.seeAllHref} className="text-sm font-semibold text-brand-600 hover:underline">
          See all
        </a>
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                isActive ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"
              )}
            >
              <Icon size={13} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
        {activeTab.id === "closets" && closets.map((c) => <ClosetCard key={c.title + c.seller.handle} closet={c} />)}
        {activeTab.id === "yard-sales" && yardSales.map((y) => <YardSaleCard key={y.title + y.seller.handle} yardSale={y} />)}
        {activeTab.id === "pre-loved" &&
          preLoved.map((p) => (
            <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
              <ProductCard product={p} />
            </div>
          ))}
      </div>
    </section>
  );
}
