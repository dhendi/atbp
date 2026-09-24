"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, ChevronRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LAUNCH_HIDDEN_CATEGORY_SLUGS } from "@/lib/feature-flags";

export interface CategoryNode {
  slug: string;
  name: string;
  icon: string;
  children: { slug: string; name: string; icon: string }[];
}

/** The single entry point to ATBP's full category taxonomy (every parent and
 * leaf category, nothing collapsed away) — a compact trigger that opens a
 * scrollable menu instead of an ever-growing wall of inline chips. Every row
 * links straight to that category's own /discover view. */
export function CategoriesMenu({
  categories,
  triggerClassName,
  iconOnly,
}: {
  categories: CategoryNode[];
  triggerClassName?: string;
  iconOnly?: boolean;
}) {
  // A side flyout doesn't fit a phone-width screen (it gets cut off), so on
  // narrow viewports each group expands in place instead.
  const [narrow, setNarrow] = useState(false);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <DropdownMenu onOpenChange={(o) => { if (!o) setOpenSlug(null); }}>
      <DropdownMenuTrigger
        className={cn(
          iconOnly
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 transition-colors active:bg-ink-100"
            : "flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40",
          triggerClassName
        )}
        aria-label="Browse categories"
      >
        {iconOnly ? <Menu size={20} /> : (<><Menu size={15} /> Categories</>)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[28rem] w-72 overflow-y-auto">
        {categories.filter((cat) => !LAUNCH_HIDDEN_CATEGORY_SLUGS.has(cat.slug)).map((cat) =>
          cat.children.length === 0 ? (
            <DropdownMenuItem key={cat.slug} asChild>
              <Link href={`/discover?category=${cat.slug}`} className="font-bold text-ink-900">
                <span>{cat.icon}</span> {cat.name}
              </Link>
            </DropdownMenuItem>
          ) : narrow ? (
            <div key={cat.slug}>
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setOpenSlug(openSlug === cat.slug ? null : cat.slug); }}
                className="font-bold text-ink-900"
                aria-expanded={openSlug === cat.slug}
              >
                <span>{cat.icon}</span> {cat.name}
                {openSlug === cat.slug ? <ChevronDown size={14} className="ml-auto text-ink-400" /> : <ChevronRight size={14} className="ml-auto text-ink-400" />}
              </DropdownMenuItem>
              {openSlug === cat.slug && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/discover?category=${cat.slug}`} className="pl-8 font-bold text-ink-900">All {cat.name}</Link>
                  </DropdownMenuItem>
                  {cat.children.map((child) => (
                    <DropdownMenuItem key={child.slug} asChild>
                      <Link href={`/discover?category=${child.slug}`} className="pl-8 font-normal text-ink-600">{child.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </div>
          ) : (
            // Groups open a side flyout (hover on desktop, tap on mobile) so the
            // main list stays short; the first row of the flyout is the group itself.
            <DropdownMenuSub key={cat.slug}>
              <DropdownMenuSubTrigger className="font-bold text-ink-900">
                <span>{cat.icon}</span> {cat.name}
                <ChevronRight size={14} className="ml-auto text-ink-400" />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[24rem] w-64 overflow-y-auto">
                <DropdownMenuItem asChild>
                  <Link href={`/discover?category=${cat.slug}`} className="font-bold text-ink-900">All {cat.name}</Link>
                </DropdownMenuItem>
                {cat.children.map((child) => (
                  <DropdownMenuItem key={child.slug} asChild>
                    <Link href={`/discover?category=${child.slug}`} className="font-normal text-ink-600">
                      {child.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
