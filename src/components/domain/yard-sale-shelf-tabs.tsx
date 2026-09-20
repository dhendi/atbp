"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { YardSaleCard, type YardSaleCardData } from "@/components/domain/yard-sale-card";
import { SectionHeader } from "@/components/domain/section-header";

/** Consolidates what used to be four separate full-width Explore shelves
 * (Near You, This Weekend, Trending, Ending Soon) — same four underlying
 * queries, presented as tabs of one section instead of four competing ones. */
export function YardSaleShelfTabs({
  nearby, thisWeekend, trending, endingSoon, area,
}: { nearby: YardSaleCardData[]; thisWeekend: YardSaleCardData[]; trending: YardSaleCardData[]; endingSoon: YardSaleCardData[]; area: string | null }) {
  const tabs = [
    ...(nearby.length > 0 ? [{ id: "nearby" as const, label: area ? `Near ${area}` : "Near You", items: nearby }] : []),
    ...(thisWeekend.length > 0 ? [{ id: "weekend" as const, label: "This Weekend", items: thisWeekend }] : []),
    ...(trending.length > 0 ? [{ id: "trending" as const, label: "Trending", items: trending }] : []),
    ...(endingSoon.length > 0 ? [{ id: "ending" as const, label: "Ending Soon", items: endingSoon }] : []),
  ];
  const [active, setActive] = useState(tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!activeTab) return null;

  return (
    <section>
      <SectionHeader eyebrow="⛺ Time-boxed clear-outs" title="Yard Sales" subtitle="One-time sales: here today, gone soon" seeAllHref="/yard-sales" />
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4 pb-1 md:px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
              tab.id === activeTab.id ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="no-scrollbar mt-2 flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
        {activeTab.items.map((y, i) => <YardSaleCard key={y.title + y.seller.handle + i} yardSale={y} />)}
      </div>
    </section>
  );
}
