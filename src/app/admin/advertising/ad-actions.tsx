"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateAdvertisementStatusAction, deleteAdvertisementAction } from "@/lib/actions/advertising";

export function AdActions({ adId, status }: { adId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(next: "ACTIVE" | "PAUSED" | "ENDED") {
    startTransition(async () => {
      const res = await updateAdvertisementStatusAction(adId, next);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success(`Ad ${next.toLowerCase()}`);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Delete this ad permanently? This can't be undone.")) return;
    startTransition(async () => {
      const res = await deleteAdvertisementAction(adId);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Ad deleted");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "ACTIVE" && <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("ACTIVE")}>Resume</Button>}
      {status === "ACTIVE" && <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("PAUSED")}>Pause</Button>}
      {status !== "ENDED" && <Button size="sm" variant="ghost" disabled={pending} onClick={() => setStatus("ENDED")}>End</Button>}
      <Button size="sm" variant="ghost" className="text-live-600 hover:bg-live-50" disabled={pending} onClick={remove}>Delete</Button>
    </div>
  );
}
