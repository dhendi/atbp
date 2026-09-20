"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_TYPES, CONDITIONS, SORT_OPTIONS, RATING_OPTIONS, AVAILABILITY_OPTIONS } from "@/lib/constants";
import { GENERAL_ATTRIBUTE_FILTERS, FOOD_ATTRIBUTE_FILTERS, isFoodCategorySlug } from "@/lib/attribute-filters";
import { cn } from "@/lib/utils";

interface CategoryOption {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
}

interface SellerOption {
  handle: string;
  shopName: string;
}

export function FilterBar({ categories, sellers, provinces }: { categories: CategoryOption[]; sellers: SellerOption[]; provinces: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(false);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === "all") params.delete(key);
    else params.set(key, value);
    if (key !== "page") params.delete("page"); // any filter/sort change resets to page 1
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeType = searchParams.get("type");
  const activeAttrs = (searchParams.get("attr") ?? "").split(",").filter(Boolean);
  const activeFilterCount =
    ["category", "province", "price", "condition", "rating", "seller"].filter((k) => searchParams.get(k)).length +
    (searchParams.get("avail") === "all" ? 1 : 0) +
    activeAttrs.length;

  const selectedCategory = searchParams.get("category");
  const isFoodCategory = isFoodCategorySlug(selectedCategory, categories);
  const ATTRIBUTE_FILTERS = isFoodCategory ? FOOD_ATTRIBUTE_FILTERS : GENERAL_ATTRIBUTE_FILTERS;

  function toggleAttr(key: string) {
    const next = activeAttrs.includes(key) ? activeAttrs.filter((a) => a !== key) : [...activeAttrs, key];
    updateParam("attr", next.length > 0 ? next.join(",") : null);
  }

  return (
    <div className="space-y-3 px-4 md:px-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParam("q", q);
        }}
        className="relative"
      >
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, sellers, or shops" className="pl-9 pr-24" />
        <Button type="submit" size="sm" variant="brand" className="absolute right-1 top-1/2 h-8 -translate-y-1/2">
          Search
        </Button>
      </form>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold",
            showFilters || activeFilterCount > 0 ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600"
          )}
        >
          <SlidersHorizontal size={13} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
        <Select value={searchParams.get("sort") ?? "newest"} onValueChange={(v) => updateParam("sort", v)}>
          <SelectTrigger className="h-[34px] w-44 shrink-0 rounded-full text-xs font-bold">
            <SelectValue placeholder="Sort" className="min-w-0 flex-1 truncate text-left" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {PRODUCT_TYPES.map((t) => (
          <Chip key={t.value} label={t.label} active={activeType === t.value} onClick={() => updateParam("type", activeType === t.value ? null : t.value)} />
        ))}
      </div>

      {showFilters && (
        <div className="rounded-2xl border border-ink-200 bg-white p-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Select value={searchParams.get("category") ?? "all"} onValueChange={(v) => updateParam("category", v)}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={searchParams.get("province") ?? "all"} onValueChange={(v) => updateParam("province", v)}>
              <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anywhere in PH</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={searchParams.get("condition") ?? "all"} onValueChange={(v) => updateParam("condition", v)}>
              <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Condition</SelectItem>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={searchParams.get("price") ?? "all"} onValueChange={(v) => updateParam("price", v)}>
              <SelectTrigger><SelectValue placeholder="Price" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Price</SelectItem>
                <SelectItem value="0-500">Under ₱500</SelectItem>
                <SelectItem value="500-2000">₱500 - ₱2,000</SelectItem>
                <SelectItem value="2000-10000">₱2,000 - ₱10,000</SelectItem>
                <SelectItem value="10000-999999">₱10,000+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={searchParams.get("rating") ?? "all"} onValueChange={(v) => updateParam("rating", v)}>
              <SelectTrigger><SelectValue placeholder="Seller Rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Rating</SelectItem>
                {RATING_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={searchParams.get("seller") ?? "all"} onValueChange={(v) => updateParam("seller", v)}>
              <SelectTrigger><SelectValue placeholder="Seller" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sellers</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.handle} value={s.handle}>{s.shopName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={searchParams.get("avail") ?? "in_stock"} onValueChange={(v) => updateParam("avail", v === "in_stock" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Availability" /></SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {ATTRIBUTE_FILTERS.map((a) => {
              const active = activeAttrs.includes(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => toggleAttr(a.key)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-bold",
                    active ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600"
                  )}
                >
                  <a.icon size={11} /> {a.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {["category", "province", "condition", "price", "rating", "seller"].map((k) =>
              searchParams.get(k) ? (
                <button
                  key={k}
                  onClick={() => updateParam(k, null)}
                  className="flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-600"
                >
                  {searchParams.get(k)} <X size={11} />
                </button>
              ) : null
            )}
            {searchParams.get("avail") === "all" && (
              <button
                onClick={() => updateParam("avail", null)}
                className="flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-600"
              >
                Include Sold Out <X size={11} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold whitespace-nowrap",
        active ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600"
      )}
    >
      {label}
    </button>
  );
}
