"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhLocationPicker } from "@/components/domain/ph-location-picker";
import { ImageUploader } from "@/components/domain/image-uploader";
import { FileUploader } from "@/components/domain/file-uploader";
import { IdDocumentUploader } from "@/components/domain/id-document-uploader";
import { becomeCasualServiceSellerAction } from "@/lib/actions/services";
import { createDigitalProductAction } from "@/lib/actions/digital-products";

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
}

export function DigitalProductListingForm({ needsOnboarding, categories }: { needsOnboarding: boolean; categories: CategoryOption[] }) {
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [handle, setHandle] = useState("");
  const [province, setProvince] = useState("");
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentUrl, setIdDocumentUrl] = useState("");
  const [selfiePhotoUrl, setSelfiePhotoUrl] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [images, setImages] = useState<string[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [rightsAttested, setRightsAttested] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsOnboarding) {
      if (!shopName.trim() || !handle.trim() || !province) return toast.error("Fill in your shop name, handle, and area.");
      if (!idDocumentType || !idDocumentUrl) return toast.error("Upload a government ID to verify your identity.");
      if (!selfiePhotoUrl) return toast.error("Take a live selfie holding your ID to verify your identity.");
    }
    if (!title.trim() || !description.trim()) return toast.error("Add a title and description.");
    if (!categoryId) return toast.error("Choose a category.");
    if (images.length === 0) return toast.error("Add at least one preview image.");
    if (fileUrls.length === 0) return toast.error("Upload at least one file for buyers to download.");
    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) return toast.error("Set a price.");
    if (!rightsAttested) return toast.error("Please confirm you own or are licensed to sell this.");

    setLoading(true);
    if (needsOnboarding) {
      const onboard = await becomeCasualServiceSellerAction({ shopName, handle: handle.toLowerCase(), province, idDocumentType, idDocumentUrl, selfiePhotoUrl });
      if ("error" in onboard) {
        setLoading(false);
        return toast.error(onboard.error);
      }
    }
    const res = await createDigitalProductAction({
      title, description, categoryId, images, fileUrls, price: priceNum, deliveryInstructions, rightsAttested,
    });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Digital product listed!");
    router.push(`/product/${res.productId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-card border border-ink-100 bg-white p-5">
      {needsOnboarding && (
        <div className="space-y-4 border-b border-ink-100 pb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Set up your shop</p>
          <div className="space-y-1.5">
            <Label>Shop name</Label>
            <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Maria's Templates" required />
          </div>
          <div className="space-y-1.5">
            <Label>Handle</Label>
            <Input value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())} placeholder="e.g. mariastemplates" required />
          </div>
          <div className="space-y-1.5">
            <Label>Where are you based?</Label>
            <PhLocationPicker value={province || null} onChange={setProvince} />
          </div>
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
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Minimalist Notion Planner Template" required />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's included, file formats, how to use it..." rows={4} required />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Preview images</Label>
        <ImageUploader value={images} onChange={setImages} max={6} label="Add previews" />
      </div>
      <div className="space-y-1.5">
        <Label>Price (₱)</Label>
        <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 250" required />
      </div>
      <div className="space-y-1.5">
        <Label>File(s) buyers will download</Label>
        <FileUploader value={fileUrls} onChange={setFileUrls} max={5} label="Add files" />
        <p className="text-xs text-ink-400">Buyers never see this file directly. They get a secure, expiring download link tied to their order.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Delivery notes (optional)</Label>
        <Textarea value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} placeholder="e.g. Unzip and open in Figma 2023 or later." rows={2} />
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
        <input type="checkbox" checked={rightsAttested} onChange={(e) => setRightsAttested(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500" />
        <span>I own the rights to sell this file, or am licensed/authorized to distribute it, and it isn&apos;t pirated, cracked, or content I don&apos;t have permission to resell.</span>
      </label>

      <Button type="submit" variant="brand" className="w-full" disabled={loading}>
        {loading ? "Publishing..." : "Publish Digital Product"}
      </Button>
    </form>
  );
}
