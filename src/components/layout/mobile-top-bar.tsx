"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Search, Bell, ShoppingCart, User } from "lucide-react";
import { LogoMark } from "./logo";
import { CategoriesMenu, type CategoryNode } from "@/components/domain/categories-menu";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Etsy-style order: categories, logo, search, notifications, cart, profile —
 * one dense row rather than a logo/area cluster plus a separate icon cluster. */
export function MobileTopBar({ categories }: { categories: CategoryNode[] }) {
  const { data: session } = useSession();
  const { data: counts } = useSWR(session ? "/api/me/counts" : null, fetcher, { refreshInterval: 15000 });

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1.5 border-b border-ink-100 bg-white/90 px-3 backdrop-blur-md md:hidden">
      <CategoriesMenu categories={categories} iconOnly triggerClassName="shrink-0" />

      <Link href="/" className="flex shrink-0 items-center">
        <LogoMark className="h-8 w-8" />
      </Link>

      <form action="/search" className="relative min-w-0 flex-1">
        <input
          name="q"
          placeholder="Search"
          className="h-9 w-full rounded-full border border-ink-200 bg-ink-50 pl-3.5 pr-9 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-500 active:bg-ink-100"
        >
          <Search size={16} />
        </button>
      </form>

      {session && (
        <Link href="/notifications" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 active:bg-ink-100">
          <Bell size={20} />
          {!!counts?.unreadNotifications && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-live-500" />}
        </Link>
      )}

      <Link href="/cart" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 active:bg-ink-100">
        <ShoppingCart size={20} />
        {!!counts?.cartCount && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-live-500 px-1 text-[10px] font-bold text-white">
            {counts.cartCount > 9 ? "9+" : counts.cartCount}
          </span>
        )}
      </Link>

      <Link href={session ? "/profile" : "/login"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 active:bg-ink-100">
        <User size={20} />
      </Link>
    </header>
  );
}
