"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveReportAction } from "@/lib/actions/admin";

export function ReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(status: "REVIEWED" | "RESOLVED" | "DISMISSED") {
    startTransition(async () => {
      const res = await resolveReportAction(reportId, status);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Report updated");
      router.refresh();
    });
  }

  return (
    <div className="mt-2.5 flex gap-1.5">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("REVIEWED")}>Mark Reviewed</Button>
      <Button size="sm" variant="brand" disabled={pending} onClick={() => apply("RESOLVED")}>Resolve</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => apply("DISMISSED")}>Dismiss</Button>
    </div>
  );
}
