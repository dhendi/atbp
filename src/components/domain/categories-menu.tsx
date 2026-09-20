"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
  return (
    <DropdownMenu>
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
        {categories.filter((cat) => !LAUNCH_HIDDEN_CATEGORY_SLUGS.has(cat.slug)).map((cat) => (
          <div key={cat.slug}>
            <DropdownMenuItem asChild>
              <Link href={`/discover?category=${cat.slug}`} className="font-bold text-ink-900">
                <span>{cat.icon}</span> {cat.name}
              </Link>
            </DropdownMenuItem>
            {cat.children.map((child) => (
              <DropdownMenuItem key={child.slug} asChild>
                <Link href={`/discover?category=${child.slug}`} className="pl-8 font-normal text-ink-600">
                  {child.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
