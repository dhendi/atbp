"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatPeso } from "@/lib/utils";
import { buyPromotionAction } from "@/lib/actions/monetization";

interface PromotionType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  minPrice: number;
  maxPrice: number;
  unit: string;
}

const PLACEMENT_BY_CODE: Record<string, "HOMEPAGE" | "CATEGORY" | "SEARCH" | "DISCOVER"> = {
  BOOST: "DISCOVER",
  FEATURED: "DISCOVER",
  CATEGORY_FEATURE: "CATEGORY",
  HOMEPAGE_FEATURE: "HOMEPAGE",
  SPONSORED_CAMPAIGN: "HOMEPAGE",
};

export function PromotionForm({
  products, promotionTypes, creditBalance,
}: { products: { id: string; title: string }[]; promotionTypes: PromotionType[]; creditBalance: number }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [typeCode, setTypeCode] = useState(promotionTypes[0]?.code ?? "");
  const type = promotionTypes.find((t) => t.code === typeCode);
  const [price, setPrice] = useState(type?.minPrice ?? 0);
  const [days, setDays] = useState(7);
  const [pending, startTransition] = useTransition();

  function handleTypeChange(code: string) {
    setTypeCode(code);
    const t = promotionTypes.find((pt) => pt.code === code);
    if (t) setPrice(t.minPrice);
  }

  function handleSubmit() {
    if (!type) return;
    startTransition(async () => {
      const res = await buyPromotionAction({
        productId, promotionTypeCode: type.code, placement: PLACEMENT_BY_CODE[type.code] ?? "DISCOVER", price, days,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Promotion is live!");
    });
  }

  const willUseCredits = creditBalance >= price;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Listing</Label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm">
          {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Promotion type</Label>
        <select value={typeCode} onChange={(e) => handleTypeChange(e.target.value)} className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm">
          {promotionTypes.map((t) => <option key={t.code} value={t.code}>{t.name} (₱{t.minPrice}–₱{t.maxPrice})</option>)}
        </select>
        {type?.description && <p className="text-xs text-ink-500">{type.description}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Price (₱{type?.minPrice}–₱{type?.maxPrice})</Label>
          <input
            type="number" value={price} min={type?.minPrice} max={type?.maxPrice}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Runs for (days)</Label>
          <input
            type="number" value={days} min={1} max={30}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-500">
          {willUseCredits ? `Paid from your ${formatPeso(creditBalance)} in promotional credits.` : "Runs through ATBP's demo payment flow."}
        </p>
        <Button variant="brand" onClick={handleSubmit} disabled={pending || !productId || !type}>
          {pending ? "Processing..." : `Promote for ${formatPeso(price)}`}
        </Button>
      </div>
    </div>
  );
}
