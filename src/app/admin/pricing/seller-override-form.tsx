"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setSellerPlanOverrideAction, removeSellerPlanOverrideAction } from "@/lib/actions/admin-pricing";

interface Override {
  sellerId: string; shopName: string; handle: string;
  activeListingLimitOverride: number | null; monthlyListingLimitOverride: number | null;
  weeklyAuctionLimitOverride: number | null; activeAuctionLimitOverride: number | null;
  reason: string | null;
}

export function SellerOverrideForm({ sellers, existingOverrides }: { sellers: { id: string; shopName: string; handle: string }[]; existingOverrides: Override[] }) {
  const [sellerId, setSellerId] = useState(sellers[0]?.id ?? "");
  const [form, setForm] = useState({ activeListingLimitOverride: "", monthlyListingLimitOverride: "", weeklyAuctionLimitOverride: "", activeAuctionLimitOverride: "", reason: "" });
  const [pending, startTransition] = useTransition();

  function num(v: string): number | null | undefined {
    return v.trim() === "" ? null : Number(v);
  }

  function handleSave() {
    startTransition(async () => {
      const res = await setSellerPlanOverrideAction(sellerId, {
        activeListingLimitOverride: num(form.activeListingLimitOverride),
        monthlyListingLimitOverride: num(form.monthlyListingLimitOverride),
        weeklyAuctionLimitOverride: num(form.weeklyAuctionLimitOverride),
        activeAuctionLimitOverride: num(form.activeAuctionLimitOverride),
        reason: form.reason || undefined,
      });
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Override saved.");
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removeSellerPlanOverrideAction(id);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Override removed.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-ink-100 bg-white p-4">
        <div className="mb-3 space-y-1.5">
          <Label className="text-xs">Seller</Label>
          <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="h-9 w-full rounded-lg border border-ink-200 px-2.5 text-sm">
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.shopName} (@{s.handle})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <NumField label="Active listings" value={form.activeListingLimitOverride} onChange={(v) => setForm({ ...form, activeListingLimitOverride: v })} />
          <NumField label="New / month" value={form.monthlyListingLimitOverride} onChange={(v) => setForm({ ...form, monthlyListingLimitOverride: v })} />
          <NumField label="Auctions / week" value={form.weeklyAuctionLimitOverride} onChange={(v) => setForm({ ...form, weeklyAuctionLimitOverride: v })} />
          <NumField label="Active auctions" value={form.activeAuctionLimitOverride} onChange={(v) => setForm({ ...form, activeAuctionLimitOverride: v })} />
        </div>
        <div className="mt-2.5 space-y-1.5">
          <Label className="text-xs">Reason (shown to the seller)</Label>
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="h-9 w-full rounded-lg border border-ink-200 px-2.5 text-sm" placeholder="e.g. Trusted seller, 2+ years, clean record" />
        </div>
        <Button size="sm" variant="brand" className="mt-3" onClick={handleSave} disabled={pending}>{pending ? "Saving..." : "Save override"}</Button>
      </div>

      {existingOverrides.length > 0 && (
        <div className="space-y-2">
          {existingOverrides.map((o) => (
            <div key={o.sellerId} className="flex items-center justify-between rounded-2xl border border-ink-100 p-3 text-sm">
              <div>
                <p className="font-bold text-ink-900">{o.shopName} <span className="font-normal text-ink-400">@{o.handle}</span></p>
                <p className="text-xs text-ink-500">
                  {[
                    o.activeListingLimitOverride != null && `listings: ${o.activeListingLimitOverride}`,
                    o.monthlyListingLimitOverride != null && `monthly: ${o.monthlyListingLimitOverride}`,
                    o.weeklyAuctionLimitOverride != null && `weekly auctions: ${o.weeklyAuctionLimitOverride}`,
                    o.activeAuctionLimitOverride != null && `active auctions: ${o.activeAuctionLimitOverride}`,
                  ].filter(Boolean).join(" · ") || "no overrides set"}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleRemove(o.sellerId)} disabled={pending}>Remove</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="No override" className="h-9 w-full rounded-lg border border-ink-200 px-2.5 text-sm" />
    </div>
  );
}
