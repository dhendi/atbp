"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Store, Package, ClipboardList, Star, Users, Flag, ShieldCheck, Tag, Tags, MapPin, Sparkles, Receipt, Scale, Radio, DollarSign, Megaphone, CalendarDays, ChevronLeft, LifeBuoy, ScrollText, Trophy, Shirt, MessageCircle, Volume2, Gavel, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { LIVESTREAMS_ENABLED } from "@/lib/feature-flags";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/sellers", label: "Sellers", icon: Store },
  { href: "/admin/founding-sellers", label: "Founding 200", icon: Trophy },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/messages", label: "Messages", icon: MessageCircle },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/broadcast", label: "Broadcast", icon: Volume2 },
  { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/category-suggestions", label: "Category Tags", icon: Tags },
  { href: "/admin/closets", label: "Closets", icon: Shirt },
  { href: "/admin/markets", label: "Markets", icon: MapPin },
  { href: "/admin/collections", label: "Collections", icon: Sparkles },
  { href: "/admin/drops", label: "Drops", icon: Sparkles },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/pricing", label: "Pricing", icon: DollarSign },
  { href: "/admin/advertising", label: "Advertising", icon: Megaphone },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/disputes", label: "Disputes", icon: Scale },
  { href: "/admin/fraud-flags", label: "Fraud Signals", icon: ShieldAlert },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/admin/auctions", label: "Auctions", icon: Gavel },
];

const betaItems = LIVESTREAMS_ENABLED ? [{ href: "/admin/livestreams", label: "Live selling (beta)", icon: Radio }] : [];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-100 bg-white px-3 py-5 md:flex">
        <div className="mb-6 px-2">
          <Logo />
          <p className="mt-1 px-0.5 text-xs font-bold uppercase tracking-wide text-live-500">Admin</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"
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
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap",
                  active ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"
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
