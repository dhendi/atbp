"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { reportContentAction } from "@/lib/actions/social";

const GENERIC_REASONS = [
  "Counterfeit or misrepresented item",
  "Prohibited or unsafe item",
  "Spam or scam",
  "Harassment or inappropriate behavior",
  "Other",
];

// Maps to the prohibited-items policy and RA 11967 (Internet Transactions
// Act) grounds for a marketplace to act on a listing report — kept distinct
// from GENERIC_REASONS since those cover sellers/livestreams/users too,
// where categories like "Wrong category / misleading listing" don't apply.
export const PRODUCT_REPORT_REASONS = [
  "Prohibited or illegal item",
  "Counterfeit or fake",
  "Unsafe or dangerous product",
  "Scam or fraudulent listing",
  "Wrong category / misleading listing",
  "Offensive or inappropriate content",
  "Spam",
  "Other",
];

const DETAILS_MAX_LENGTH = 500;

export function ReportDialog({
  targetType,
  targetLabel,
  productId,
  alreadyReported = false,
  triggerLabel = "Report",
  triggerClassName,
  hideTrigger = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  targetType: "PRODUCT" | "USER" | "SELLER" | "LIVESTREAM";
  targetLabel: string;
  productId?: string;
  /** Server-computed: this signed-in user already has an open report on this
   * exact product. Only meaningful for targetType="PRODUCT". */
  alreadyReported?: boolean;
  triggerLabel?: string;
  triggerClassName?: string;
  /** Renders no trigger of its own — open state is fully controlled via
   * `open`/`onOpenChange` instead. Needed when the thing opening this dialog
   * isn't a plain button next to it (e.g. a dropdown menu item on a card,
   * where Radix's own trigger/portal nesting doesn't play well with a second
   * portal underneath it). */
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const reasons = targetType === "PRODUCT" ? PRODUCT_REPORT_REASONS : GENERIC_REASONS;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await reportContentAction({ targetType, targetLabel, productId, reason, details });
    setLoading(false);
    if ("error" in res) {
      if (res.error === "Please log in first.") {
        setOpen(false);
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname ?? "/")}`);
        return;
      }
      toast.error(res.error);
      return;
    }
    toast.success("Thanks, our team will review this.");
    setDetails("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <button className={triggerClassName ?? "flex items-center gap-1.5 rounded text-xs font-semibold text-ink-500 hover:text-live-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"}>
            <Flag size={13} /> {triggerLabel}
          </button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetLabel}</DialogTitle>
          {!alreadyReported && (
            <DialogDescription>Tell us what&apos;s wrong. Reports are reviewed by the ATBP team, not the seller.</DialogDescription>
          )}
        </DialogHeader>
        {alreadyReported ? (
          <p className="py-2 text-sm text-ink-600">You&apos;ve already reported this. Our team is reviewing it.</p>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {reasons.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Details (optional)</Label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value.slice(0, DETAILS_MAX_LENGTH))}
                  maxLength={DETAILS_MAX_LENGTH}
                  placeholder="Add any details that would help us review this."
                />
                <p className="text-right text-[11px] text-ink-400">{details.length}/{DETAILS_MAX_LENGTH}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" disabled={loading} onClick={submit}>
                {loading ? "Submitting..." : "Submit report"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
