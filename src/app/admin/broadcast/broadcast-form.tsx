"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { broadcastNotificationAction } from "@/lib/actions/admin";

const TARGETS = [
  { value: "ALL" as const, label: "All users" },
  { value: "BUYERS" as const, label: "Buyers only" },
  { value: "SELLERS" as const, label: "Sellers only" },
];

export function BroadcastForm() {
  const [target, setTarget] = useState<"ALL" | "BUYERS" | "SELLERS">("ALL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function send() {
    startTransition(async () => {
      const res = await broadcastNotificationAction(target, title, body, linkUrl || undefined);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success(`Sent to ${res.recipientCount} user${res.recipientCount === 1 ? "" : "s"}`);
      setTitle("");
      setBody("");
      setLinkUrl("");
      setConfirming(false);
    });
  }

  return (
    <div className="space-y-4 rounded-card border border-ink-100 bg-white p-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Audience</Label>
        <div className="flex gap-2">
          {TARGETS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTarget(t.value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${target === t.value ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scheduled maintenance this Sunday" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Message</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="e.g. ATBP will be briefly unavailable from 2–3 AM for maintenance." />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Link (optional)</Label>
        <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/deals" />
      </div>

      {!confirming ? (
        <Button variant="brand" disabled={!title.trim() || !body.trim()} onClick={() => setConfirming(true)}>Review &amp; send</Button>
      ) : (
        <div className="rounded-xl border border-gold-300 bg-gold-100 p-3">
          <p className="text-sm font-semibold text-gold-800">Send to {TARGETS.find((t) => t.value === target)?.label.toLowerCase()}?</p>
          <p className="mt-1 text-xs text-gold-700">This can&apos;t be unsent once delivered.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="brand" disabled={pending} onClick={send}>{pending ? "Sending..." : "Confirm send"}</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
