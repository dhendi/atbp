"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminSetSellerPlanAction } from "@/lib/actions/admin-pricing";

/** Directly assigns a seller onto a specific plan — no self-serve billing
 * flow, no payment. See adminSetSellerPlanAction for why this needed to
 * exist: the only prior admin lever (SellerPlanOverride) adjusts limits,
 * never the plan/commission itself. */
export function SellerPlanAssignForm({
  sellers, plans, currentPlanBySellerId,
}: { sellers: { id: string; shopName: string; handle: string }[]; plans: { code: string; name: string }[]; currentPlanBySellerId: Record<string, string> }) {
  const [sellerId, setSellerId] = useState(sellers[0]?.id ?? "");
  const [planCode, setPlanCode] = useState(plans[0]?.code ?? "");
  const [pending, startTransition] = useTransition();

  function handleAssign() {
    startTransition(async () => {
      const res = await adminSetSellerPlanAction(sellerId, planCode);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Plan assigned.");
    });
  }

  const current = currentPlanBySellerId[sellerId];

  return (
    <div className="rounded-card border border-ink-100 bg-white p-4">
      <div className="grid gap-2.5 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Seller</Label>
          <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="h-9 w-full rounded-lg border border-ink-200 px-2.5 text-sm">
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.shopName} (@{s.handle})</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Plan</Label>
          <select value={planCode} onChange={(e) => setPlanCode(e.target.value)} className="h-9 w-full rounded-lg border border-ink-200 px-2.5 text-sm">
            {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>
      </div>
      {current && <p className="mt-2 text-xs text-ink-500">Currently on: <span className="font-semibold text-ink-700">{current}</span></p>}
      <Button size="sm" variant="brand" className="mt-3" onClick={handleAssign} disabled={pending || !sellerId}>
        {pending ? "Assigning..." : "Assign plan"}
      </Button>
      <p className="mt-2 text-xs text-ink-400">No payment is charged; this sets the record directly. Use for comping a seller or fixing a billing mixup.</p>
    </div>
  );
}
