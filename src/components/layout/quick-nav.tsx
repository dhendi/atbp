"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, Shirt, Tent, Store, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { AUCTIONS_ENABLED, SERVICES_ENABLED, MARKETS_ENABLED } from "@/lib/feature-flags";

// Explore/Deals/Trending used to live here too, but they're already primary
// nav (top-nav/bottom-nav) — repeating them was a second, competing set of
// navigation vocabulary. What's left here are the "special finds"
// destinations that don't have their own primary-nav slot but are still a
// main feature of ATBP — real routes, shown on both the homepage and Explore.
// Markets is off at launch — see MARKETS_ENABLED in lib/feature-flags.ts.
const items = [
  { href: "/closets", label: "Closet", icon: Shirt, color: "text-gold-600 bg-gold-100" },
  { href: "/yard-sales", label: "Yard Sale", icon: Tent, color: "text-teal-600 bg-teal-100" },
  ...(SERVICES_ENABLED ? [{ href: "/services", label: "Services", icon: Briefcase, color: "text-pink-500 bg-pink-100" }] : []),
  ...(MARKETS_ENABLED ? [{ href: "/markets", label: "Markets", icon: Store, color: "text-brand-700 bg-brand-100" }] : []),
  ...(AUCTIONS_ENABLED ? [{ href: "/auctions", label: "Auctions", icon: Gavel, color: "text-ink-900 bg-ink-100" }] : []),
];

// Tailwind needs the full class name written somewhere for its compiler to
// keep it — this map is that somewhere, since the column count is dynamic.
const GRID_COLS: Record<number, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-3 sm:grid-cols-5",
  6: "grid-cols-3 sm:grid-cols-6",
  7: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-7",
};

/** A quick-links tile row for ATBP's "special finds" destinations — shown on
 * both the homepage and the Explore page (see discover/page.tsx), since
 * these are a main feature of ATBP even though they don't have their own
 * primary-nav slot (Explore/Trending/Deals/Local do). */
export function QuickNav() {
  const pathname = usePathname();

  return (
    <nav className="px-4 md:px-6">
      <div className={cn("mx-auto grid max-w-6xl gap-2 md:gap-4", GRID_COLS[items.length] ?? "grid-cols-3")}>
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 transition-colors",
                active ? "border-ink-900 bg-ink-900" : "border-transparent " + item.color
              )}
            >
              <Icon size={22} strokeWidth={2.3} className={active ? "text-white" : ""} />
              <span className={cn("text-[11px] font-extrabold", active ? "text-white" : "")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
