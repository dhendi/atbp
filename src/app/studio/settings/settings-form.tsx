"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/domain/image-uploader";
import { PhLocationPicker } from "@/components/domain/ph-location-picker";
import { updateSellerProfileAction } from "@/lib/actions/social";

interface SocialLinks { facebook?: string; instagram?: string; tiktok?: string }

export function SettingsForm({
  initial, handle,
}: { initial: { shopName: string; description: string; bannerUrl: string; logoUrl: string; province: string; announcement: string; socialLinks: SocialLinks; returnPolicy: string }; handle: string }) {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await updateSellerProfileAction(form);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Shop settings saved");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label>Shop handle</Label>
        <Input value={`@${handle}`} disabled />
      </div>
      <div className="space-y-1.5">
        <Label>Shop name</Label>
        <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label>Description / story</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Province / City</Label>
        <PhLocationPicker value={form.province || null} onChange={(v) => setForm({ ...form, province: v })} />
      </div>
      <div className="space-y-1.5">
        <Label>Shop announcement</Label>
        <Input
          value={form.announcement}
          onChange={(e) => setForm({ ...form, announcement: e.target.value })}
          placeholder="e.g. New pieces going up Saturday"
          maxLength={120}
        />
        <p className="text-xs text-ink-400">Shows as a banner at the top of your shop page. Leave blank to hide it.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Social links (optional)</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Input
            value={form.socialLinks.facebook ?? ""}
            onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, facebook: e.target.value } })}
            placeholder="Facebook URL"
          />
          <Input
            value={form.socialLinks.instagram ?? ""}
            onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, instagram: e.target.value } })}
            placeholder="Instagram URL"
          />
          <Input
            value={form.socialLinks.tiktok ?? ""}
            onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, tiktok: e.target.value } })}
            placeholder="TikTok URL"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Return policy</Label>
        <Textarea
          value={form.returnPolicy}
          onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
          placeholder="e.g. Returns accepted within 7 days for unused items. Buyer covers return shipping. No returns on custom or made-to-order pieces."
          maxLength={600}
        />
        <p className="text-xs text-ink-400">Shown on your shop page and every one of your product pages. Leave blank if you don&apos;t offer returns.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Logo</Label>
        <ImageUploader
          value={form.logoUrl ? [form.logoUrl] : []}
          onChange={(urls) => setForm({ ...form, logoUrl: urls[0] ?? "" })}
          max={1}
          compact
        />
      </div>
      <div className="space-y-1.5">
        <Label>Banner</Label>
        <ImageUploader
          value={form.bannerUrl ? [form.bannerUrl] : []}
          onChange={(urls) => setForm({ ...form, bannerUrl: urls[0] ?? "" })}
          max={1}
        />
      </div>
      <Button type="submit" variant="brand" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
