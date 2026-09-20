"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, Compass, TrendingUp, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

// Same five destinations as the desktop top-nav — Profile/Account, Cart,
// Search, and Notifications are utility functions, not primary-nav
// destinations, and stay reachable from the mobile top bar's own icons
// instead of taking a slot here (see mobile-top-bar.tsx).
const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Explore", icon: Compass },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/deals", label: "Deals", icon: Tag },
  { href: "/local", label: "Local", icon: MapPin },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-ink-100 bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center gap-1 py-2.5">
              <Icon size={22} strokeWidth={active ? 2.4 : 2} className={active ? "text-brand-600" : "text-ink-400"} />
              <span className={cn("text-[10px] font-semibold", active ? "text-ink-900" : "text-ink-400")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
