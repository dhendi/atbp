"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { closeStoreAction, reopenStoreAction } from "@/lib/actions/seller-account";

/** Voluntary, graceful store closure — separate from admin Suspend (for-cause)
 * and from the Local & Pickup "temporarily closed" toggle above, which just
 * means "not open for business right now," not "shut down." */
export function CloseStorePanel({ status, closedAt, closeReason, blockers }: {
  status: string; closedAt: string | null; closeReason: string | null; blockers: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  if (status === "CLOSED") {
    function reopen() {
      startTransition(async () => {
        const res = await reopenStoreAction();
        if ("error" in res) { toast.error(res.error); return; }
        toast.success("Your store is back open");
        router.refresh();
      });
    }

    return (
      <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5">
        <h3 className="font-bold text-ink-900">Your store is closed</h3>
        <p className="mt-1 text-sm text-ink-500">
          Closed {closedAt ? new Date(closedAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : ""}
          {closeReason && ` ("${closeReason}")`}. Your listings are archived and hidden from buyers.
        </p>
        <Button className="mt-3" variant="brand" disabled={pending} onClick={reopen}>Reopen my store</Button>
      </div>
    );
  }

  function close() {
    startTransition(async () => {
      const res = await closeStoreAction(reason);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Your store is now closed");
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-ink-200 p-5">
      <h3 className="font-bold text-ink-900">Close my store</h3>
      <p className="mt-1 text-sm text-ink-500">
        Stop selling on ATBP. Your listings will be archived and hidden from buyers, and your account and order history stay intact. You can reopen any time.
      </p>
      {blockers.length > 0 && (
        <p className="mt-2 text-xs font-semibold text-live-600">Not yet. Resolve first: {blockers.join(", ")}.</p>
      )}
      {!confirming ? (
        <Button className="mt-3" variant="outline" disabled={blockers.length > 0} onClick={() => setConfirming(true)}>Close my store</Button>
      ) : (
        <div className="mt-3 space-y-2">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you closing? (optional, helps us improve)" rows={2} />
          <div className="flex gap-2">
            <Button variant="live" disabled={pending} onClick={close}>Yes, close my store</Button>
            <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
