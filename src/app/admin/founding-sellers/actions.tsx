"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminGrantFoundingSellerAction, adminRevokeFoundingSellerAction } from "@/lib/actions/admin";

/** Manual grant — for the edge case where a seller should have qualified
 * automatically (approval + BIR verification) but didn't, e.g. because of
 * how those two events were ordered. Bypasses the normal eligibility check
 * entirely; the admin using this is making a deliberate call, which is why
 * it's logged. */
export function GrantFoundingSellerForm({ candidates, remaining }: { candidates: { id: string; shopName: string; handle: string }[]; remaining: number }) {
  const router = useRouter();
  const [sellerId, setSellerId] = useState(candidates[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  if (candidates.length === 0) {
    return <p className="text-sm text-ink-500">No approved, non-founding sellers to grant a slot to.</p>;
  }

  function grant() {
    startTransition(async () => {
      const res = await adminGrantFoundingSellerAction(sellerId);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Founding Seller slot granted");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2.5">
      <div className="min-w-[220px] flex-1 space-y-1.5">
        <Label className="text-xs">Seller</Label>
        <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="h-9 w-full rounded-lg border border-ink-200 px-2.5 text-sm">
          {candidates.map((s) => <option key={s.id} value={s.id}>{s.shopName} (@{s.handle})</option>)}
        </select>
      </div>
      <Button variant="brand" disabled={pending || remaining <= 0} onClick={grant}>
        {remaining <= 0 ? "No slots left" : "Grant slot"}
      </Button>
    </div>
  );
}

export function RevokeFoundingSellerButton({ sellerId }: { sellerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open) {
    return <Button size="sm" variant="ghost" className="text-live-600 hover:bg-live-50" onClick={() => setOpen(true)}>Revoke</Button>;
  }

  function revoke() {
    if (!reason.trim()) { toast.error("A reason is required."); return; }
    startTransition(async () => {
      const res = await adminRevokeFoundingSellerAction(sellerId, reason);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Founding Seller status revoked");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason"
        className="h-8 w-32 rounded-md border border-ink-200 px-2 text-xs"
        autoFocus
      />
      <Button size="sm" variant="destructive" disabled={pending} onClick={revoke}>Confirm</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
}
