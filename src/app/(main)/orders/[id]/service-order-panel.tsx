"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, FileText, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/utils";
import { submitServiceRequirementsAction, requestServiceRevisionAction, acceptServiceDeliveryAction } from "@/lib/actions/services";

interface Delivery {
  id: string;
  fileUrls: string[];
  message: string | null;
  createdAt: string;
}

export function ServiceOrderPanel({
  orderId, packageTier, deliveryDays, revisionsIncluded, revisionsUsed, status, requirementsBrief, dueAt, deliveries,
}: {
  orderId: string;
  packageTier: string;
  deliveryDays: number;
  revisionsIncluded: number;
  revisionsUsed: number;
  status: string;
  requirementsBrief: string | null;
  dueAt: string | null;
  deliveries: Delivery[];
}) {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmitBrief() {
    if (!brief.trim()) return toast.error("Tell the seller what you need.");
    setLoading(true);
    const res = await submitServiceRequirementsAction(orderId, brief);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Requirements sent to the seller.");
    router.refresh();
  }

  async function handleAccept() {
    setLoading(true);
    const res = await acceptServiceDeliveryAction(orderId);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Delivery accepted. Funds released to the seller.");
    router.refresh();
  }

  async function handleRequestRevision() {
    setLoading(true);
    const res = await requestServiceRevisionAction(orderId, revisionNotes);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Revision requested.");
    setShowRevisionForm(false);
    setRevisionNotes("");
    router.refresh();
  }

  const revisionsLeft = Math.max(0, revisionsIncluded - revisionsUsed);
  const latestDelivery = deliveries[deliveries.length - 1];

  return (
    <section className="mb-4 rounded-card border border-ink-100 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900">
        <Handshake size={16} /> {packageTier} Package
      </h2>
      <p className="text-sm text-ink-500">
        {deliveryDays}-day delivery · {revisionsIncluded} revision{revisionsIncluded !== 1 ? "s" : ""} included
        {revisionsUsed > 0 && ` (${revisionsLeft} left)`}
      </p>

      {status === "AWAITING_BRIEF" && (
        <div className="mt-3 space-y-2 border-t border-ink-100 pt-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-800"><FileText size={14} /> Tell the seller what you need</p>
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Describe what you'd like made: references, sizes, style, deadline context, anything the seller needs to get started."
            rows={4}
          />
          <Button variant="brand" onClick={handleSubmitBrief} disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send Requirements"}
          </Button>
        </div>
      )}

      {status !== "AWAITING_BRIEF" && requirementsBrief && (
        <div className="mt-3 space-y-1 border-t border-ink-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Your requirements</p>
          <p className="text-sm text-ink-700">{requirementsBrief}</p>
          {dueAt && ["IN_PROGRESS", "REVISION_REQUESTED"].includes(status) && (
            <p className="text-xs text-ink-500">Due {new Date(dueAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</p>
          )}
        </div>
      )}

      {deliveries.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-ink-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            {deliveries.length > 1 ? `Deliveries (${deliveries.length})` : "Delivery"}
          </p>
          {(status === "DELIVERED" ? [latestDelivery] : deliveries).map((d) => (
            <div key={d.id} className="rounded-xl bg-ink-50 p-3">
              {d.message && <p className="text-sm text-ink-700">{d.message}</p>}
              {d.fileUrls.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {d.fileUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-brand-600 hover:underline">
                      Download file {i + 1}
                    </a>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[11px] text-ink-400">{timeAgo(d.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {status === "DELIVERED" && (
        <div className="mt-3 space-y-2 border-t border-ink-100 pt-3">
          {!showRevisionForm ? (
            <div className="flex gap-2">
              <Button variant="brand" onClick={handleAccept} disabled={loading} className="flex-1">
                <CheckCircle2 size={15} /> Accept Delivery
              </Button>
              {revisionsLeft > 0 && (
                <Button variant="outline" onClick={() => setShowRevisionForm(true)} disabled={loading} className="flex-1">
                  <RotateCcw size={15} /> Request Revision
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} placeholder="What needs to change?" rows={3} />
              <div className="flex gap-2">
                <Button variant="brand" onClick={handleRequestRevision} disabled={loading} className="flex-1">
                  {loading ? "Sending..." : "Send Revision Request"}
                </Button>
                <Button variant="ghost" onClick={() => setShowRevisionForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {revisionsLeft === 0 && (
            <p className="text-xs text-ink-400">No revisions left on this package. Accept the delivery or report a problem if something&apos;s wrong.</p>
          )}
        </div>
      )}

      {status === "COMPLETED" && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-ink-100 pt-3 text-sm font-semibold text-live-600">
          <CheckCircle2 size={15} /> Delivery accepted
        </p>
      )}
    </section>
  );
}
