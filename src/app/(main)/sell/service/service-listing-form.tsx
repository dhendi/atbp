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
import { IdDocumentUploader } from "@/components/domain/id-document-uploader";
import { becomeCasualServiceSellerAction, createServiceAction, type ServicePackageInput } from "@/lib/actions/services";

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
}

const TIERS: ServicePackageInput["tier"][] = ["BASIC", "STANDARD", "PREMIUM"];

function emptyPackage(tier: ServicePackageInput["tier"]): ServicePackageInput {
  return { tier, price: 0, deliverables: "", deliveryDays: 3, revisionsIncluded: 1 };
}

export function ServiceListingForm({ needsOnboarding, categories }: { needsOnboarding: boolean; categories: CategoryOption[] }) {
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
  const [activeTiers, setActiveTiers] = useState<Record<string, boolean>>({ BASIC: true });
  const [packages, setPackages] = useState<Record<string, ServicePackageInput>>({ BASIC: emptyPackage("BASIC") });
  const [rightsAttested, setRightsAttested] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleTier(tier: ServicePackageInput["tier"]) {
    setActiveTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));
    if (!packages[tier]) setPackages((prev) => ({ ...prev, [tier]: emptyPackage(tier) }));
  }

  function updatePackage(tier: string, patch: Partial<ServicePackageInput>) {
    setPackages((prev) => ({ ...prev, [tier]: { ...prev[tier], ...patch } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsOnboarding) {
      if (!shopName.trim() || !handle.trim() || !province) return toast.error("Fill in your shop name, handle, and area.");
      if (!idDocumentType || !idDocumentUrl) return toast.error("Upload a government ID to verify your identity.");
      if (!selfiePhotoUrl) return toast.error("Take a live selfie holding your ID to verify your identity.");
    }
    if (!title.trim() || !description.trim()) return toast.error("Add a title and description.");
    if (!categoryId) return toast.error("Choose a category.");
    if (images.length === 0) return toast.error("Add at least one sample/portfolio image.");
    const chosenPackages = TIERS.filter((t) => activeTiers[t]).map((t) => packages[t]);
    if (chosenPackages.length === 0) return toast.error("Add at least one package.");
    if (!rightsAttested) return toast.error("Please confirm you own or are licensed to offer this service.");

    setLoading(true);
    if (needsOnboarding) {
      const onboard = await becomeCasualServiceSellerAction({ shopName, handle: handle.toLowerCase(), province, idDocumentType, idDocumentUrl, selfiePhotoUrl });
      if ("error" in onboard) {
        setLoading(false);
        return toast.error(onboard.error);
      }
    }
    const res = await createServiceAction({ title, description, categoryId, images, packages: chosenPackages, rightsAttested });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Service listed!");
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
            <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Maria Designs" required />
          </div>
          <div className="space-y-1.5">
            <Label>Handle</Label>
            <Input value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())} placeholder="e.g. mariadesigns" required />
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
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. I will design a modern logo for your brand" required />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What you offer, your process, your experience..." rows={4} required />
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
        <Label>Sample / portfolio images</Label>
        <ImageUploader value={images} onChange={setImages} max={6} label="Add samples" />
      </div>

      <div className="space-y-3">
        <Label>Packages</Label>
        {TIERS.map((tier) => (
          <div key={tier} className={`rounded-2xl border p-3.5 ${activeTiers[tier] ? "border-brand-300 bg-brand-50/40" : "border-ink-200"}`}>
            <label className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <input type="checkbox" checked={!!activeTiers[tier]} onChange={() => toggleTier(tier)} className="h-4 w-4 accent-brand-500" />
              {tier}
            </label>
            {activeTiers[tier] && (
              <div className="mt-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label>Price (₱)</Label>
                    <Input type="number" min={1} value={packages[tier]?.price || ""} onChange={(e) => updatePackage(tier, { price: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Delivery (days)</Label>
                    <Input type="number" min={1} value={packages[tier]?.deliveryDays || ""} onChange={(e) => updatePackage(tier, { deliveryDays: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>What&apos;s included</Label>
                  <Textarea
                    value={packages[tier]?.deliverables ?? ""}
                    onChange={(e) => updatePackage(tier, { deliverables: e.target.value })}
                    placeholder="e.g. 2 logo concepts, 2 revisions, source files in PNG + SVG"
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Revisions included</Label>
                  <Input type="number" min={0} value={packages[tier]?.revisionsIncluded ?? 0} onChange={(e) => updatePackage(tier, { revisionsIncluded: Number(e.target.value) })} className="w-24" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
        <input type="checkbox" checked={rightsAttested} onChange={(e) => setRightsAttested(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500" />
        <span>I own the rights to offer this service, or am licensed/authorized to do so, and it doesn&apos;t involve doing graded academic work on someone&apos;s behalf or giving regulated professional (legal, medical, financial, tax) advice.</span>
      </label>

      <Button type="submit" variant="brand" className="w-full" disabled={loading}>
        {loading ? "Publishing..." : "Publish Service"}
      </Button>
    </form>
  );
}
