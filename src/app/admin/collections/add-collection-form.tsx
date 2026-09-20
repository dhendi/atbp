"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCollectionAction } from "@/lib/actions/admin";

export function AddCollectionForm() {
  const router = useRouter();
  const [form, setForm] = useState<{ slug: string; title: string; subtitle: string; emoji: string; type: "PICK" | "SEASONAL" | "SHOPS" }>({
    slug: "", title: "", subtitle: "", emoji: "✨", type: "PICK",
  });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createCollectionAction({ ...form, subtitle: form.subtitle || undefined, emoji: form.emoji || undefined });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Collection created");
    setForm({ slug: "", title: "", subtitle: "", emoji: "✨", type: "PICK" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>Slug (url-safe, unique)</Label>
        <Input value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="filipino-finds-under-500" required />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={form.type} onValueChange={(v) => set("type", v as typeof form.type)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PICK">ATBP Pick</SelectItem>
            <SelectItem value="SEASONAL">Seasonal</SelectItem>
            <SelectItem value="SHOPS">Shops collection</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="10 Filipino Finds Under ₱500" required />
      </div>
      <div className="space-y-1.5">
        <Label>Emoji (optional)</Label>
        <Input value={form.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={4} />
      </div>
      <div className="space-y-1.5">
        <Label>Subtitle (optional)</Label>
        <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
      </div>
      <Button type="submit" variant="brand" className="col-span-2" disabled={loading}>
        {loading ? "Creating..." : "Create collection"}
      </Button>
    </form>
  );
}
