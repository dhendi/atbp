"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/domain/image-uploader";
import { createAdvertiserAndAdAction } from "@/lib/actions/advertising";

const PLACEMENTS = ["HOMEPAGE", "CATEGORY", "SEARCH", "SELLER_PAGE", "EVENT_PAGE"];

export function AddAdForm() {
  const [advertiserName, setAdvertiserName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [placements, setPlacements] = useState<string[]>(["HOMEPAGE"]);
  const [creative, setCreative] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function togglePlacement(p: string) {
    setPlacements((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!creative[0]) { toast.error("Add a creative image."); return; }
    startTransition(async () => {
      const res = await createAdvertiserAndAdAction({
        advertiserName, contactEmail, campaignName, startAt, endAt,
        creativeImageUrl: creative[0], destinationUrl, placements,
      });
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Ad created and running.");
      setAdvertiserName(""); setContactEmail(""); setCampaignName(""); setDestinationUrl("");
      setStartAt(""); setEndAt(""); setPlacements(["HOMEPAGE"]); setCreative([]);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Input placeholder="Advertiser name (e.g. J&T Express)" value={advertiserName} onChange={(e) => setAdvertiserName(e.target.value)} required />
        <Input type="email" placeholder="Contact email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
      </div>
      <Input placeholder="Campaign name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required />
      <Input placeholder="Destination URL (https://...)" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} required />
      <div className="grid grid-cols-2 gap-2.5">
        <Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        <Input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Creative image (recommend 1200x400)</Label>
        <ImageUploader value={creative} onChange={setCreative} max={1} />
      </div>
      <div className="space-y-1.5">
        <Label>Placements</Label>
        <div className="flex flex-wrap gap-2">
          {PLACEMENTS.map((p) => (
            <button
              type="button" key={p} onClick={() => togglePlacement(p)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${placements.includes(p) ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
            >
              {p.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" variant="brand" disabled={pending}>{pending ? "Creating..." : "Create ad"}</Button>
    </form>
  );
}
