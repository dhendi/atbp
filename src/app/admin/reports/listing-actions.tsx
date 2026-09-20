"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { OctagonAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { confirmListingViolationAction, dismissListingReportsAction } from "@/lib/actions/admin";

export function ListingReportActions({ productId, reasons }: { productId: string; reasons: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0] ?? "");

  function dismiss() {
    startTransition(async () => {
      const res = await dismissListingReportsAction(productId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Report dismissed, no action taken");
      router.refresh();
    });
  }

  function confirmViolation() {
    if (!reason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    startTransition(async () => {
      const res = await confirmListingViolationAction(productId, reason.trim());
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Listing removed and warning issued");
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-2.5 flex gap-1.5">
      <Button size="sm" variant="ghost" disabled={pending} onClick={dismiss}>Dismiss</Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => setConfirmOpen(true)}>
          <OctagonAlert size={14} /> Confirm as Violation
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm as violation</DialogTitle>
            <DialogDescription>
              This removes the listing immediately and logs a warning against the seller&apos;s account. 3 active
              warnings auto-suspends the account pending review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason shown to the seller" autoFocus />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" disabled={pending} onClick={confirmViolation}>
              {pending ? "Submitting..." : "Remove & warn seller"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
