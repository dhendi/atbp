"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveFraudFlagAction } from "@/lib/actions/admin";

export function ResolveFraudFlagButton({ flagId }: { flagId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState("");

  function resolve() {
    if (!resolution.trim()) return toast.error("Note what you found or did.");
    startTransition(async () => {
      const res = await resolveFraudFlagAction(flagId, resolution);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Marked reviewed");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Mark reviewed</Button>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ink-200 bg-white p-3">
      <input
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        placeholder="e.g. Checked out fine, cleared / Suspended seller"
        className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="brand" disabled={pending} onClick={resolve}>Confirm</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
