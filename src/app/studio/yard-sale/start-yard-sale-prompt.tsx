"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhLocationPicker } from "@/components/domain/ph-location-picker";
import { createYardSaleAction } from "@/lib/actions/yard-sale";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function StartYardSalePrompt({ defaultCity, defaultTitle }: { defaultCity: string; defaultTitle: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [city, setCity] = useState(defaultCity);
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) return toast.error("Pick a start and end date.");
    setLoading(true);
    const res = await createYardSaleAction({ title, city, description, startDate, endDate });
    setLoading(false);
    if ("error" in res && res.error) return toast.error(res.error);
    toast.success("Your Yard Sale is live!");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-ink-100 bg-white p-4">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>City</Label>
        <PhLocationPicker value={city || null} onChange={setCity} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Starts</Label>
          <Input type="date" value={startDate} min={todayISO()} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Ends</Label>
          <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>
      <p className="text-xs text-ink-500">Up to 1 month. It closes automatically once the end date passes.</p>
      <div className="space-y-1.5">
        <Label>Description (optional)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Clearing out my closet, everything priced to go" />
      </div>
      <Button type="submit" variant="brand" className="w-full" disabled={loading}>
        {loading ? "Starting..." : "Start My Yard Sale"}
      </Button>
    </form>
  );
}
