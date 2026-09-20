"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { submitGuestDisputeAction } from "@/lib/actions/guest-checkout";

const REASONS = ["Item not as described", "Item never arrived", "Damaged item", "Wrong item received", "Other"];

export function GuestDisputeButton({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await submitGuestDisputeAction(token, reason, details);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Dispute submitted. Our team will review it.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Report a Problem</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription>We&apos;ll open a dispute and review your order.</DialogDescription>
          </DialogHeader>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-3 h-11 w-full rounded-xl border border-ink-200 px-3 text-sm"
          >
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <Textarea placeholder="Tell us what happened" value={details} onChange={(e) => setDetails(e.target.value)} />
          <Button variant="destructive" className="mt-3 w-full" disabled={loading} onClick={submit}>
            {loading ? "Submitting..." : "Submit Dispute"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
