"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhLocationPicker } from "@/components/domain/ph-location-picker";
import { openClosetAction } from "@/lib/actions/closet";

export function OpenClosetPrompt({ defaultCity }: { defaultCity: string }) {
  const router = useRouter();
  const [city, setCity] = useState(defaultCity);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setLoading(true);
    const res = await openClosetAction({ city });
    setLoading(false);
    if ("error" in res && res.error) return toast.error(res.error);
    toast.success("Your Closet is open!");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-card border border-ink-100 bg-white p-4">
      <div className="space-y-1.5">
        <Label>Where&apos;s your Closet based?</Label>
        <PhLocationPicker value={city || null} onChange={setCity} />
      </div>
      <Button variant="brand" className="w-full" disabled={loading || !city} onClick={handleOpen}>
        {loading ? "Opening..." : "Open My Closet"}
      </Button>
    </div>
  );
}
