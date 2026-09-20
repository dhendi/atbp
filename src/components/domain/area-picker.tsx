"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PhLocationPicker } from "@/components/domain/ph-location-picker";
import { cn } from "@/lib/utils";
import { nearestArea } from "@/lib/local-shared";
import { setAreaAction } from "@/lib/actions/local";

export function AreaPicker({ area, compact = false }: { area: string | null; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  async function choose(next: string) {
    setLoading(next);
    const res = await setAreaAction(next);
    setLoading(null);
    if ("error" in res) return toast.error(res.error);
    setOpen(false);
    router.refresh();
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        choose(nearestArea(pos.coords.latitude, pos.coords.longitude));
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Pick a city instead.");
      },
      { timeout: 8000 }
    );
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

          <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={useMyLocation} disabled={locating}>
            <Navigation size={15} />
            {locating ? "Finding you..." : "Use my location"}
          </Button>

          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-semibold text-ink-500">Or choose a region, province, then city</p>
            <PhLocationPicker value={area} onChange={choose} disabled={!!loading} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
