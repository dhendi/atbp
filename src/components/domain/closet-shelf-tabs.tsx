"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ClosetCard, type ClosetCardData } from "@/components/domain/closet-card";
import { SectionHeader } from "@/components/domain/section-header";

/** Consolidates what used to be four separate full-width Explore shelves
 * (For You, Trending, Near You, Staff Picks) — same four underlying
 * queries, presented as tabs of one section instead of four competing ones. */
export function ClosetShelfTabs({
  forYou, trending, nearby, staffPicks, area,
}: { forYou: ClosetCardData[]; trending: ClosetCardData[]; nearby: ClosetCardData[]; staffPicks: ClosetCardData[]; area: string | null }) {
  const tabs = [
    ...(forYou.length > 0 ? [{ id: "for-you" as const, label: "For You", items: forYou }] : []),
    ...(trending.length > 0 ? [{ id: "trending" as const, label: "Trending", items: trending }] : []),
    ...(nearby.length > 0 ? [{ id: "nearby" as const, label: area ? `Near ${area}` : "Near You", items: nearby }] : []),
    ...(staffPicks.length > 0 ? [{ id: "staff" as const, label: "Staff Picks", items: staffPicks }] : []),
  ];
  const [active, setActive] = useState(tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!activeTab) return null;

  return (
    <section>
      <SectionHeader eyebrow="🧺 Pre-loved, sold personally" title="Closets" subtitle="Real people clearing out real closets" seeAllHref="/closets" />
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
        {activeTab.items.map((c, i) => <ClosetCard key={c.title + c.seller.handle + i} closet={c} />)}
      </div>
    </section>
  );
}
