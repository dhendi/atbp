"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LocationListPicker } from "@/components/domain/ph-location-picker";
import { cn } from "@/lib/utils";
import { setAreaAction } from "@/lib/actions/local";

export function AreaPicker({ area, compact = false }: { area: string | null; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function choose(next: string) {
    setLoading(true);
    const res = await setAreaAction(next);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-full text-sm font-semibold transition-colors",
          compact ? "px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100" : "px-3.5 py-2 text-ink-600 hover:bg-ink-100 hover:text-ink-900"
        )}
      >
        <MapPin size={compact ? 13 : 15} className="text-brand-600" />
        {area ?? "Set your area"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your area</DialogTitle>
            <DialogDescription>Used to show what&apos;s nearby: sellers, pickup options, and local drops.</DialogDescription>
          </DialogHeader>
          <LocationListPicker value={area} onChange={choose} disabled={loading} />
        </DialogContent>
      </Dialog>
    </>
  );
}
