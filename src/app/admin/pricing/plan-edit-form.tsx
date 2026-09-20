"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateSellerPlanAction } from "@/lib/actions/admin-pricing";

interface Plan {
  id: string; code: string; name: string; monthlyPrice: number; transactionFeePercent: number;
  maxActiveListings: number; maxNewListingsPerMonth: number; maxAuctionsPerWeek: number; maxActiveAuctions: number;
}

export function PlanEditForm({ plan }: { plan: Plan }) {
  const [form, setForm] = useState({
    monthlyPrice: plan.monthlyPrice, transactionFeePercent: plan.transactionFeePercent,
    maxActiveListings: plan.maxActiveListings, maxNewListingsPerMonth: plan.maxNewListingsPerMonth,
    maxAuctionsPerWeek: plan.maxAuctionsPerWeek, maxActiveAuctions: plan.maxActiveAuctions,
  });
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await updateSellerPlanAction(plan.id, form);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success(`${plan.name} updated.`);
    });
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-4">
      <h3 className="mb-3 font-bold text-ink-900">{plan.name} <span className="text-xs font-normal text-ink-400">({plan.code})</span></h3>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Monthly price (₱)" value={form.monthlyPrice} onChange={(v) => setForm({ ...form, monthlyPrice: v })} />
        <Field label="Transaction fee (%)" value={form.transactionFeePercent} onChange={(v) => setForm({ ...form, transactionFeePercent: v })} step="0.1" />
        <Field label="Max active listings" value={form.maxActiveListings} onChange={(v) => setForm({ ...form, maxActiveListings: v })} />
        <Field label="New listings / month" value={form.maxNewListingsPerMonth} onChange={(v) => setForm({ ...form, maxNewListingsPerMonth: v })} />
        <Field label="Auctions / week" value={form.maxAuctionsPerWeek} onChange={(v) => setForm({ ...form, maxAuctionsPerWeek: v })} />
        <Field label="Max active auctions" value={form.maxActiveAuctions} onChange={(v) => setForm({ ...form, maxActiveAuctions: v })} />
      </div>
      <Button size="sm" variant="brand" className="mt-3" onClick={handleSave} disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <input
        type="number" value={value} step={step ?? "1"}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full rounded-lg border border-ink-200 px-2.5 text-sm"
      />
    </div>
  );
}
