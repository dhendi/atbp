"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { hideReviewAction, unhideReviewAction, deleteReviewAction } from "@/lib/actions/admin";

export function ReviewModerationActions({ reviewId, hidden }: { reviewId: string; hidden: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "hide" | "delete">("idle");
  const [reason, setReason] = useState("");

  function unhide() {
    startTransition(async () => {
      const res = await unhideReviewAction(reviewId);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Review unhidden");
      router.refresh();
    });
  }

  function submit() {
    if (!reason.trim()) { toast.error("A reason is required."); return; }
    startTransition(async () => {
      const res = mode === "delete" ? await deleteReviewAction(reviewId, reason) : await hideReviewAction(reviewId, reason);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success(mode === "delete" ? "Review deleted" : "Review hidden");
      setMode("idle");
      setReason("");
      router.refresh();
    });
  }

  if (mode !== "idle") {
    return (
      <div className="mt-2 flex flex-col gap-2 rounded-xl border border-ink-200 bg-ink-50 p-3">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`Reason for ${mode === "delete" ? "deleting" : "hiding"} this review`}
          className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" variant={mode === "delete" ? "destructive" : "live"} disabled={pending} onClick={submit}>
            Confirm {mode === "delete" ? "delete" : "hide"}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setMode("idle")}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex gap-2">
      {hidden ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={unhide}>Unhide</Button>
      ) : (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setMode("hide")}>Hide</Button>
      )}
      <Button size="sm" variant="ghost" className="text-live-600 hover:bg-live-50" disabled={pending} onClick={() => setMode("delete")}>Delete</Button>
    </div>
  );
}
