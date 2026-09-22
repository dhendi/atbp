"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { TopNav } from "./top-nav";
import { MobileTopBar } from "./mobile-top-bar";
import type { CategoryNode } from "@/components/domain/categories-menu";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** TopNav (desktop) and MobileTopBar (mobile) are both always mounted — CSS
 * (`hidden md:block` / `md:hidden`) picks which one shows, not React — so
 * each independently calling useSession()/useSWR("/api/me/counts") meant
 * every page load fired that pair of requests twice. Fetched once here and
 * passed down as props instead. */
export function SiteHeader({ area, categories }: { area: string | null; categories: CategoryNode[] }) {
  const { data: session } = useSession();
  const { data: counts } = useSWR(session ? "/api/me/counts" : null, fetcher, { refreshInterval: 15000 });

  return (
    <>
      <TopNav area={area} categories={categories} session={session} counts={counts} />
      <MobileTopBar categories={categories} session={session} counts={counts} />
    </>
  );
}
