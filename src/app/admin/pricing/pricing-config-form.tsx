"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updatePricingConfigAction } from "@/lib/actions/admin-pricing";

export function PricingConfigForm({ config }: { config: { key: string; value: number; description: string | null } }) {
  const [value, setValue] = useState(config.value);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await updatePricingConfigAction(config.key, value);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Saved.");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink-900">{config.key.replace(/_/g, " ")}</p>
        {config.description && <p className="text-[11px] text-ink-400">{config.description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="h-9 w-28 min-w-0 rounded-lg border border-ink-200 px-2 text-sm" />
        <Button size="sm" variant="outline" onClick={handleSave} disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  );
}
