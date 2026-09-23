"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Boxes, ClipboardList, Users, BarChart3, Wallet, Store, Star, MessageCircle, Radio, Gavel, Tag, Ticket, Megaphone, Sparkles, ChevronLeft, Shirt, Tent, Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { AUCTIONS_ENABLED, LIVESTREAMS_ENABLED } from "@/lib/feature-flags";

// My Shop (Products, Deals, Auctions, Promotions, Inventory) only applies to
// BIR-verified+ sellers — a CASUAL seller sells through My Closet/My Yard
// Sale instead, which every seller sees regardless of tier.
function buildItems(birVerified: boolean) {
  return [
    { href: "/studio", label: "Overview", icon: LayoutDashboard },
    { href: "/studio/plan", label: "Plan & Billing", icon: Sparkles },
    { href: "/studio/closet", label: "My Closet", icon: Shirt },
    { href: "/studio/yard-sale", label: "My Yard Sale", icon: Tent },
    { href: "/studio/tawad", label: "Tawad Inbox", icon: Handshake },
    ...(birVerified
      ? [
          { href: "/studio/products", label: "Products", icon: Package },
          ...(AUCTIONS_ENABLED ? [{ href: "/studio/auctions", label: "Auctions", icon: Gavel }] : []),
          { href: "/studio/deals", label: "Deals", icon: Tag },
          { href: "/studio/promo-codes", label: "Promos", icon: Ticket },
          { href: "/studio/promotions", label: "Promotions", icon: Megaphone },
        ]
      : []),
    { href: "/studio/orders", label: "Orders", icon: ClipboardList },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/studio/customers", label: "Customers", icon: Users },
    { href: "/studio/settings", label: "Shop", icon: Store },
    { href: "/studio/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/studio/reviews", label: "Reviews", icon: Star },
    ...(birVerified ? [{ href: "/studio/inventory", label: "Inventory", icon: Boxes }] : []),
    { href: "/studio/payouts", label: "Payouts", icon: Wallet },
  ];
}

const betaItems = LIVESTREAMS_ENABLED ? [{ href: "/studio/livestreams", label: "Live selling (beta)", icon: Radio }] : [];

export function StudioSidebar({ birVerified = false }: { birVerified?: boolean }) {
  const pathname = usePathname();
  const items = buildItems(birVerified);

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-100 bg-white px-3 py-5 md:flex">
        <div className="mb-6 px-2">
          <Logo />
          <p className="mt-1 px-0.5 text-xs font-bold uppercase tracking-wide text-brand-500">Seller Studio</p>
        </div>
        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const active = item.href === "/studio" ? pathname === "/studio" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? "bg-brand-500 text-white" : "text-ink-600 hover:bg-ink-100"
                )}
              >
                <Icon size={17} /> {item.label}
              </Link>
            );
          })}
        </nav>
        {betaItems.length > 0 && (
          <div className="space-y-1 border-t border-ink-100 pt-2">
            {betaItems.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors",
                    active ? "bg-ink-100 text-ink-800" : "text-ink-400 hover:bg-ink-100 hover:text-ink-600"
                  )}
                >
                  <Icon size={16} /> {item.label}
                </Link>
              );
            })}
          </div>
        )}
        <Link href="/" className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-ink-400 hover:text-ink-700">
          <ChevronLeft size={16} /> Back to ATBP
        </Link>
      </aside>

      <nav className="sticky top-0 z-20 flex items-center gap-2 border-b border-ink-100 bg-white px-2 py-2 md:hidden">
        <Link
          href="/"
          aria-label="Back to ATBP"
          className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-ink-500 hover:bg-ink-100"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const active = item.href === "/studio" ? pathname === "/studio" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap",
                  active ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
