"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";
import { Search, Bell, MessageCircle, ShoppingCart, Heart } from "lucide-react";
import { Logo } from "./logo";
import { AreaPicker } from "@/components/domain/area-picker";
import { CategoriesMenu, type CategoryNode } from "@/components/domain/categories-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, initials } from "@/lib/utils";
import { AUCTIONS_ENABLED } from "@/lib/feature-flags";

// Kept deliberately short — five items, obvious purpose each (see the
// top-of-file note in the homepage for the full "Home = discover, Explore =
// browse everything, Trending = what's popular, Deals = save money, Local =
// find local things" rationale). Auctions, Closets, Yard Sales, and Services
// are all still fully live routes — just reachable from Explore rather than
// competing for a seventh/eighth primary nav slot.
const links = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Explore" },
  { href: "/trending", label: "Trending" },
  { href: "/deals", label: "Deals" },
  { href: "/local", label: "Local" },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TopNav({ area, categories }: { area: string | null; categories: CategoryNode[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: counts } = useSWR(session ? "/api/me/counts" : null, fetcher, { refreshInterval: 15000 });

  return (
    <header className="sticky top-0 z-40 hidden md:block border-b border-ink-100 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
        <Logo />

        <CategoriesMenu categories={categories} triggerClassName="border-transparent bg-transparent px-2 hover:bg-ink-100" />

        <AreaPicker area={area} compact />

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  active ? "text-ink-900 bg-ink-100" : "text-ink-500 hover:text-ink-900 hover:bg-ink-50"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* The row has no spare width for a search box among 6 nav links + the
            icon cluster, so a focused search overlays wider on top of them
            (via absolute positioning anchored to this reserved-width slot)
            rather than trying to reflow the whole header. */}
        <div className="relative ml-2 max-w-sm flex-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              if (q) router.push(`/search?q=${encodeURIComponent(q as string)}`);
            }}
            className="relative z-50 w-full transition-[width] duration-200 ease-out focus-within:absolute focus-within:left-0 focus-within:top-1/2 focus-within:w-[28rem] focus-within:-translate-y-1/2"
          >
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                name="q"
                placeholder="Search products, sellers, or shops"
                className="h-10 w-full rounded-full border border-ink-200 bg-white pl-9 pr-4 text-sm text-ink-800 shadow-sm placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
            </div>
          </form>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="brand" size="sm" asChild className="mr-1">
            <Link href="/sell">Sell on ATBP</Link>
          </Button>

          {session ? (
            <>
              <IconLink href="/saved" icon={<Heart size={19} />} />
              <IconLink href="/notifications" icon={<Bell size={19} />} count={counts?.unreadNotifications} />
              <IconLink href="/messages" icon={<MessageCircle size={19} />} count={counts?.unreadMessages} />
              <IconLink href="/cart" icon={<ShoppingCart size={19} />} count={counts?.cartCount} />

              <DropdownMenu>
                <DropdownMenuTrigger className="ml-1 rounded-full focus-visible:outline-none">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? ""} />
                    <AvatarFallback>{initials(session.user?.name ?? "U")}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>@{session.user?.username}</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/following">Following</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/collections">My Collections</Link>
                  </DropdownMenuItem>
                  {AUCTIONS_ENABLED && (
                    <DropdownMenuItem asChild>
                      <Link href="/bids">My Bids</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/markets">ATBP Markets</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/drops">Drops</Link>
                  </DropdownMenuItem>
                  {(session.user?.role === "SELLER" || session.user?.role === "ADMIN") && (
                    <DropdownMenuItem asChild>
                      <Link href="/studio">Seller Studio</Link>
                    </DropdownMenuItem>
                  )}
                  {session.user?.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function IconLink({ href, icon, count }: { href: string; icon: React.ReactNode; count?: number }) {
  return (
    <Link href={href} className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100 hover:text-ink-900">
      {icon}
      {!!count && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-live-500 px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
