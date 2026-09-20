"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveDisputeAction } from "@/lib/actions/admin";

export function DisputeActions({ disputeId, status }: { disputeId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(next: "UNDER_REVIEW" | "RESOLVED_REFUND" | "RESOLVED_DENIED" | "CLOSED") {
    startTransition(async () => {
      const res = await resolveDisputeAction(disputeId, next);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Dispute updated");
      router.refresh();
    });
  }

  return (
    <div className="mt-2.5 flex gap-1.5">
      {status === "OPEN" && <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("UNDER_REVIEW")}>Mark Under Review</Button>}
      <Button size="sm" variant="brand" disabled={pending} onClick={() => apply("RESOLVED_REFUND")}>Approve Refund</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("RESOLVED_DENIED")}>Deny</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => apply("CLOSED")}>Close</Button>
    </div>
  );
}
