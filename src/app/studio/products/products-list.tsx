"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPeso, cn } from "@/lib/utils";
import { bulkUpdateProductStatusAction, bulkDeleteProductsAction } from "@/lib/actions/products";
import { toggleProductFeaturedAction } from "@/lib/actions/social";
import { ProductRowActions } from "./product-row-actions";

const STATUS_VARIANT: Record<string, "success" | "subtle" | "live" | "outline"> = {
  ACTIVE: "success",
  DRAFT: "outline",
  SOLD_OUT: "subtle",
  REMOVED: "subtle",
  FLAGGED: "live",
  PAUSED_CAP: "live",
};

export interface ProductRow {
  id: string;
  title: string;
  image: string;
  categoryIcon: string;
  categoryName: string;
  sku: string | null;
  price: number;
  quantityAvailable: number;
  quantity: number;
  status: string;
  listingType: string;
  featured: boolean;
}

function FeaturedToggle({ productId, initialFeatured }: { productId: string; initialFeatured: boolean }) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title={featured ? "Remove from Featured on your shop page" : "Add to Featured on your shop page"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await toggleProductFeaturedAction(productId);
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          setFeatured(!!res.featured);
        })
      }
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", featured ? "text-gold-500" : "text-ink-300 hover:text-ink-500")}
    >
      <Star size={17} className={featured ? "fill-gold-500" : ""} />
    </button>
  );
}

export function ProductsList({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const selectableIds = products.filter((p) => p.listingType === "FIXED").map((p) => p.id);
  const allSelectableSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelectableSelected ? new Set() : new Set(selectableIds));
  }

  function runBulk(status: "ACTIVE" | "DRAFT") {
    startTransition(async () => {
      const res = await bulkUpdateProductStatusAction([...selected], status);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.count} product${res.count === 1 ? "" : "s"} ${status === "ACTIVE" ? "published" : "unpublished"}`);
      setSelected(new Set());
      router.refresh();
    });
  }

  function runBulkDelete() {
    if (!confirm(`Remove ${selected.size} product${selected.size === 1 ? "" : "s"}? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await bulkDeleteProductsAction([...selected]);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.count} product${res.count === 1 ? "" : "s"} removed`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div>
      {selectableIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-ink-200 bg-ink-50 px-3.5 py-2.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
            <input type="checkbox" checked={allSelectableSelected} onChange={toggleAll} className="h-4 w-4 rounded" />
            {selected.size > 0 ? `${selected.size} selected` : "Select all"}
          </label>
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => runBulk("ACTIVE")}>Publish</Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => runBulk("DRAFT")}>Unpublish</Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={runBulkDelete} className="text-red-600 hover:bg-red-50">Delete</Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {products.map((p) => {
          const selectable = p.listingType === "FIXED";
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3">
              {selectable ? (
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 shrink-0 rounded"
                />
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                <Image src={p.image} alt={p.title} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{p.title}</p>
                <p className="text-xs text-ink-500">{p.categoryIcon} {p.categoryName} · SKU {p.sku ?? "N/A"}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-ink-900">{formatPeso(p.price)}</p>
                <p className="text-xs text-ink-500">{p.quantityAvailable}/{p.quantity} left</p>
              </div>
              <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{p.status.replace("_", " ")}</Badge>
              <FeaturedToggle productId={p.id} initialFeatured={p.featured} />
              <ProductRowActions productId={p.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
