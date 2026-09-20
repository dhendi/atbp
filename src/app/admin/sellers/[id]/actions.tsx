"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  clearSellerWarningAction,
  reinstateSellerAction,
  adminCloseSellerStoreAction,
  adminReopenSellerStoreAction,
  reviewSellerIdAction,
} from "@/lib/actions/admin";

export function SellerIdReviewActions({ sellerId }: { sellerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    startTransition(async () => {
      const res = await reviewSellerIdAction(sellerId, true);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("ID verified");
      router.refresh();
    });
  }

  function reject() {
    if (!reason.trim()) return toast.error("Explain what needs to change.");
    startTransition(async () => {
      const res = await reviewSellerIdAction(sellerId, false, reason);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Sent back to seller");
      setRejecting(false);
      router.refresh();
    });
  }

  if (rejecting) {
    return (
      <div className="mt-2 space-y-2 rounded-xl border border-ink-200 bg-white p-3">
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Photo is blurry, name doesn't match shop name" rows={2} />
        <div className="flex gap-2">
          <Button size="sm" variant="live" disabled={pending} onClick={reject}>Confirm reject</Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRejecting(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex gap-2">
      <Button size="sm" variant="brand" disabled={pending} onClick={approve}>Approve ID</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>Reject</Button>
    </div>
  );
}

export function SellerWarningActions({ warningId }: { warningId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function clear() {
    startTransition(async () => {
      const res = await clearSellerWarningAction(warningId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Warning cleared");
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={clear}>Clear</Button>
  );
}

export function ReinstateSellerButton({ sellerId }: { sellerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function reinstate() {
    startTransition(async () => {
      const res = await reinstateSellerAction(sellerId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Seller reinstated");
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="brand" disabled={pending} onClick={reinstate}>Reinstate</Button>
  );
}

/** Support-assisted store closure — for a seller who asked support to close
 * their shop on their behalf rather than using the self-serve Studio action. */
export function CloseStoreButton({ sellerId }: { sellerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  function close() {
    startTransition(async () => {
      const res = await adminCloseSellerStoreAction(sellerId, reason);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Store closed");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Close store for seller</Button>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ink-200 bg-white p-3">
      <p className="text-xs text-ink-500">Only closes if there are no open orders or disputes. Reason is optional, visible only to admins.</p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="brand" disabled={pending} onClick={close}>Confirm close</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

export function ReopenStoreButton({ sellerId }: { sellerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function reopen() {
    startTransition(async () => {
      const res = await adminReopenSellerStoreAction(sellerId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Store reopened");
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="brand" disabled={pending} onClick={reopen}>Reopen store</Button>
  );
}
