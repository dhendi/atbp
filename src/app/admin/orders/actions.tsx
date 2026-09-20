"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminUpdateOrderStatusAction } from "@/lib/actions/admin";

const STATUSES = ["PAYMENT_PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED", "CANCELLED"];

/** A supervised way to correct an order's status without routing everything
 * through Disputes — for support intervention (e.g. a seller shipped but
 * forgot to mark it), not for anything involving money. A reason is required
 * and logged to the audit trail on every change. */
export function OrderStatusAction({ orderId, currentStatus, disputed }: { orderId: string; currentStatus: string; disputed: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");

  if (disputed) {
    return <span className="text-xs text-ink-400">Resolve via Disputes</span>;
  }

  if (!open) {
    return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Change status</Button>;
  }

  function submit() {
    if (!reason.trim()) { toast.error("A reason is required."); return; }
    startTransition(async () => {
      const res = await adminUpdateOrderStatusAction(orderId, status, reason);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Order status updated");
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-ink-200 bg-ink-50 p-2">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
        </SelectContent>
      </Select>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required, logged)"
        className="rounded-md border border-ink-200 px-2 py-1 text-xs"
      />
      <div className="flex gap-1.5">
        <Button size="sm" variant="brand" disabled={pending} onClick={submit}>Save</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
