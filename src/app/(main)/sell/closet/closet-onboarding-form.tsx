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
import { becomeClosetSellerAction } from "@/lib/actions/closet";

export function ClosetOnboardingForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState("");
  const [primaryCategories, setPrimaryCategories] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentUrl, setIdDocumentUrl] = useState("");
  const [selfiePhotoUrl, setSelfiePhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!province) return toast.error("Please choose your Closet's area.");
    if (primaryCategories.length === 0 && customTags.length === 0) {
      return toast.error("Please choose at least one category for what you're selling.");
    }
    if (!idDocumentType || !idDocumentUrl) return toast.error("Upload a government ID to verify your identity.");
    if (!selfiePhotoUrl) return toast.error("Take a live selfie to verify your identity.");
    setLoading(true);
    const res = await becomeClosetSellerAction({
      shopName,
      handle: handle.toLowerCase(),
      description,
      province,
      primaryCategories,
      customCategoryTags: customTags,
      idDocumentType,
      idDocumentUrl,
      selfiePhotoUrl,
    });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Your Closet is open!");
    router.push("/studio/closet");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-ink-100 bg-white p-5">
      <div className="space-y-1.5">
        <Label>Your name</Label>
        <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Maria" required />
        <p className="text-xs text-ink-500">Shows as &quot;{shopName || "Your name"}&apos;s Closet&quot;. You can rename it later.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Handle</Label>
        <Input value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())} placeholder="e.g. mariascloset" required />
      </div>
      <div className="space-y-1.5">
        <Label>Where are you based?</Label>
        <PhLocationPicker value={province || null} onChange={setProvince} />
      </div>
      <div className="space-y-1.5">
        <Label>Tell buyers about your Closet (optional)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Mostly clothes, shoes & accessories. Everything is pre-loved unless noted." />
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
        {loading ? "Opening..." : "Open My Closet"}
      </Button>
    </form>
  );
}
