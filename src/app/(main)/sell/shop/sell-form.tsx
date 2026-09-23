"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhLocationPicker } from "@/components/domain/ph-location-picker";
import { CategoryMultiSelect, type CategoryOption } from "@/components/domain/category-multi-select";
import { IdDocumentUploader, SingleDocumentUploader } from "@/components/domain/id-document-uploader";
import { cn } from "@/lib/utils";
import { becomeSellerAction } from "@/lib/actions/social";

type SellerKind = "INDIVIDUAL" | "BUSINESS";

export function SellForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState("");
  const [sellerKind, setSellerKind] = useState<SellerKind>("INDIVIDUAL");
  const [birRegistrationNumber, setBirRegistrationNumber] = useState("");
  const [businessLicenseUrl, setBusinessLicenseUrl] = useState("");
  const [primaryCategories, setPrimaryCategories] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentUrl, setIdDocumentUrl] = useState("");
  const [selfiePhotoUrl, setSelfiePhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!province) return toast.error("Please choose your shop's area.");
    if (sellerKind === "BUSINESS" && !birRegistrationNumber.trim()) {
      return toast.error("Please enter your BIR Certificate of Registration number.");
    }
    if (sellerKind === "BUSINESS" && !businessLicenseUrl) {
      return toast.error("Upload your BIR Certificate of Registration document.");
    }
    if (primaryCategories.length === 0 && customTags.length === 0) {
      return toast.error("Please choose at least one category for what you primarily sell.");
    }
    if (!idDocumentType || !idDocumentUrl) return toast.error("Upload a government ID to verify your identity.");
    if (!selfiePhotoUrl) return toast.error("Take a live selfie to verify your identity.");
    setLoading(true);
    const res = await becomeSellerAction({
      shopName,
      handle: handle.toLowerCase(),
      description,
      province,
      sellerKind,
      birRegistrationNumber: sellerKind === "BUSINESS" ? birRegistrationNumber.trim() : undefined,
      businessLicenseUrl: sellerKind === "BUSINESS" ? businessLicenseUrl : undefined,
      idDocumentType,
      idDocumentUrl,
      selfiePhotoUrl,
      primaryCategories,
      customCategoryTags: customTags,
    });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Application submitted!");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-ink-100 bg-white p-5">
      <div className="space-y-1.5">
        <Label>Are you selling as an individual or a business?</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSellerKind("INDIVIDUAL")}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-colors",
              sellerKind === "INDIVIDUAL" ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:bg-ink-50"
            )}
          >
            <User size={18} className={sellerKind === "INDIVIDUAL" ? "text-brand-600" : "text-ink-400"} />
            <span className="text-sm font-bold text-ink-900">Individual / personal</span>
            <span className="text-[11px] text-ink-500">Selling your own or a few items</span>
          </button>
          <button
            type="button"
            onClick={() => setSellerKind("BUSINESS")}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-colors",
              sellerKind === "BUSINESS" ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:bg-ink-50"
            )}
          >
            <Store size={18} className={sellerKind === "BUSINESS" ? "text-brand-600" : "text-ink-400"} />
            <span className="text-sm font-bold text-ink-900">Registered business</span>
            <span className="text-[11px] text-ink-500">Has a BIR Certificate of Registration</span>
          </button>
        </div>
        <p className="text-xs text-ink-500">
          Both are welcome on ATBP. Only BIR-verified registered businesses can qualify for the Founding Seller Program. Only
          verified businesses can access My Shop. Not registered? My Closet or My Yard Sale might be a better fit.
        </p>
      </div>

      {sellerKind === "BUSINESS" && (
        <div className="space-y-1.5">
          <Label>BIR Certificate of Registration (COR) number</Label>
          <Input
            value={birRegistrationNumber}
            onChange={(e) => setBirRegistrationNumber(e.target.value)}
            placeholder="e.g. 123-456-789-000"
            required
          />
          <p className="text-xs text-ink-500">Our team verifies this during approval. This alone doesn&apos;t grant Founding Seller status.</p>
          <div className="pt-1">
            <Label>Upload your BIR Certificate of Registration</Label>
            <div className="mt-1.5">
              <SingleDocumentUploader url={businessLicenseUrl} onUrlChange={setBusinessLicenseUrl} label="Upload COR document" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Shop name</Label>
        <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Manila Sneaker Vault" required />
      </div>
      <div className="space-y-1.5">
        <Label>Shop handle</Label>
        <Input value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())} placeholder="e.g. manilasneakervault" required />
      </div>
      <div className="space-y-1.5">
        <Label>Where&apos;s your shop based?</Label>
        <PhLocationPicker value={province || null} onChange={setProvince} />
      </div>
      <div className="space-y-1.5">
        <Label>Tell us about your shop</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What do you sell? What makes your shop special?" required />
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
        {loading ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
