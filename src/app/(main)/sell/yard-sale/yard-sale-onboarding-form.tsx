"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhLocationPicker } from "@/components/domain/ph-location-picker";
import { CategoryMultiSelect, type CategoryOption } from "@/components/domain/category-multi-select";
import { IdDocumentUploader } from "@/components/domain/id-document-uploader";
import { becomeYardSaleSellerAction } from "@/lib/actions/yard-sale";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function YardSaleOnboardingForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [primaryCategories, setPrimaryCategories] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentUrl, setIdDocumentUrl] = useState("");
  const [selfiePhotoUrl, setSelfiePhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!province) return toast.error("Please choose where your Yard Sale is based.");
    if (!startDate || !endDate) return toast.error("Pick a start and end date.");
    if (primaryCategories.length === 0 && customTags.length === 0) {
      return toast.error("Please choose at least one category for what you're selling.");
    }
    if (!idDocumentType || !idDocumentUrl) return toast.error("Upload a government ID to verify your identity.");
    if (!selfiePhotoUrl) return toast.error("Take a live selfie to verify your identity.");
    setLoading(true);
    const res = await becomeYardSaleSellerAction({
      shopName,
      handle: handle.toLowerCase(),
      description,
      province,
      primaryCategories,
      customCategoryTags: customTags,
      idDocumentType,
      idDocumentUrl,
      selfiePhotoUrl,
      title: title.trim() || `${shopName}'s Yard Sale`,
      city: province,
      startDate,
      endDate,
    });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Your Yard Sale is live!");
    router.push("/studio/yard-sale");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-ink-100 bg-white p-5">
      <div className="space-y-1.5">
        <Label>Your name</Label>
        <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Dhen" required />
      </div>
      <div className="space-y-1.5">
        <Label>Handle</Label>
        <Input value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())} placeholder="e.g. dhensyardsale" required />
      </div>
      <div className="space-y-1.5">
        <Label>Yard Sale title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={shopName ? `${shopName}'s Yard Sale` : "e.g. Dhen's weekend yard sale"} />
      </div>
      <div className="space-y-1.5">
        <Label>Where&apos;s it happening?</Label>
        <PhLocationPicker value={province || null} onChange={setProvince} />
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
        <Label>Tell buyers about it (optional)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Clearing out my closet, everything priced to go" />
      </div>

      <CategoryMultiSelect
        categories={categories}
        selected={primaryCategories}
        onSelectedChange={setPrimaryCategories}
        customTags={customTags}
        onCustomTagsChange={setCustomTags}
      />

      <div className="space-y-1.5">
        <Label>Verify your identity</Label>
        <IdDocumentUploader
          documentType={idDocumentType}
          onDocumentTypeChange={setIdDocumentType}
          url={idDocumentUrl}
          onUrlChange={setIdDocumentUrl}
          selfieUrl={selfiePhotoUrl}
          onSelfieUrlChange={setSelfiePhotoUrl}
        />
      </div>

      <Button type="submit" variant="brand" className="w-full" disabled={loading}>
        {loading ? "Starting..." : "Start My Yard Sale"}
      </Button>
    </form>
  );
}
