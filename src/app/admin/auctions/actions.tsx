"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminCancelAuctionAction } from "@/lib/actions/admin";

export function CancelAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open) {
    return <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>Cancel</Button>;
  }

  function confirm() {
    if (!reason.trim()) { toast.error("A reason is required."); return; }
    startTransition(async () => {
      const res = await adminCancelAuctionAction(auctionId, reason);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Auction cancelled");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="h-8 w-32 rounded-md border border-ink-200 px-2 text-xs" autoFocus />
      <Button size="sm" variant="destructive" disabled={pending} onClick={confirm}>Confirm</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
}
