"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updatePromotionTypeAction } from "@/lib/actions/admin-pricing";

interface PromotionType {
  id: string; category: string; code: string; name: string; minPrice: number; maxPrice: number; unit: string; active: boolean;
}

export function PromotionTypeEditForm({ promotionType }: { promotionType: PromotionType }) {
  const [minPrice, setMinPrice] = useState(promotionType.minPrice);
  const [maxPrice, setMaxPrice] = useState(promotionType.maxPrice);
  const [active, setActive] = useState(promotionType.active);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await updatePromotionTypeAction(promotionType.id, { minPrice, maxPrice, active });
      if ("error" in res) { toast.error(res.error); return; }
      toast.success(`${promotionType.name} updated.`);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink-900">{promotionType.name}</p>
        <p className="text-[11px] text-ink-400">{promotionType.category} · {promotionType.unit.replace(/_/g, " ").toLowerCase()}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="number" value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} className="h-9 w-24 min-w-0 rounded-lg border border-ink-200 px-2 text-sm" />
        <span className="text-ink-400">–</span>
        <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="h-9 w-24 min-w-0 rounded-lg border border-ink-200 px-2 text-sm" />
        <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-600">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
        <Button size="sm" variant="outline" onClick={handleSave} disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  );
}
