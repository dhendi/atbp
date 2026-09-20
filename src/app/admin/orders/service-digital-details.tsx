"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileDigit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  adminUpdateServiceOrderStatusAction, adminRevokeDigitalDownloadTokenAction, adminUnrevokeDigitalDownloadTokenAction,
} from "@/lib/actions/admin";

const SERVICE_STATUSES = ["AWAITING_BRIEF", "IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED", "COMPLETED"];

interface Token { id: string; title: string; revoked: boolean; downloadCount: number; maxDownloads: number; expiresAt: string }

export function ServiceDigitalDetails({
  serviceOrder, tokens,
}: { serviceOrder: { id: string; status: string } | null; tokens: Token[] }) {
  const [open, setOpen] = useState(false);
  if (!serviceOrder && tokens.length === 0) return null;

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <FileDigit size={13} /> Details
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Service &amp; digital delivery</DialogTitle>
            <DialogDescription>Direct intervention for stuck service orders or compromised download links. Not for anything involving a refund, which still goes through Disputes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {serviceOrder && <ServiceStatusControl serviceOrderId={serviceOrder.id} status={serviceOrder.status} />}
            {tokens.length > 0 && <TokenList tokens={tokens} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ServiceStatusControl({ serviceOrderId, status }: { serviceOrderId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [next, setNext] = useState(status);
  const [reason, setReason] = useState("");

  function submit() {
    if (!reason.trim()) { toast.error("A reason is required."); return; }
    startTransition(async () => {
      const res = await adminUpdateServiceOrderStatusAction(serviceOrderId, next, reason);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Service order updated");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-ink-200 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Service order: currently {status.replace(/_/g, " ")}</p>
      <div className="flex flex-col gap-2">
        <Select value={next} onValueChange={setNext}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SERVICE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, logged)" className="h-9 rounded-lg border border-ink-200 px-2.5 text-sm" />
        <Button size="sm" variant="brand" disabled={pending} onClick={submit}>Save</Button>
      </div>
      {next === "COMPLETED" && <p className="mt-1.5 text-xs text-ink-400">Marking Completed releases funds for payout, same as the buyer confirming.</p>}
    </div>
  );
}

function TokenList({ tokens }: { tokens: Token[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(tokenId: string, revoke: boolean) {
    startTransition(async () => {
      const res = revoke ? await adminRevokeDigitalDownloadTokenAction(tokenId, "Revoked from order details") : await adminUnrevokeDigitalDownloadTokenAction(tokenId);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success(revoke ? "Download link revoked" : "Download link restored");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-ink-200 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Digital download links</p>
      <div className="space-y-1.5">
        {tokens.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink-800">{t.title}</p>
              <p className="text-ink-400">{t.downloadCount}/{t.maxDownloads} downloads · expires {new Date(t.expiresAt).toLocaleDateString("en-PH")}{t.revoked && " · revoked"}</p>
            </div>
            <Button size="sm" variant={t.revoked ? "outline" : "destructive"} disabled={pending} onClick={() => toggle(t.id, !t.revoked)}>
              {t.revoked ? "Restore" : "Revoke"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
