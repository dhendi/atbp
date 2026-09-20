"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMarketAction } from "@/lib/actions/admin";

export function AddMarketForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", city: "", tagline: "", imageUrl: "", schedule: "" });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createMarketAction({
      ...form,
      imageUrl: form.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(form.name)}/1200/800`,
    });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Market added");
    setForm({ name: "", city: "", tagline: "", imageUrl: "", schedule: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1.5">
        <Label>Market name</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>City</Label>
        <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Schedule</Label>
        <Input value={form.schedule} onChange={(e) => set("schedule", e.target.value)} placeholder="Sundays, 8am-4pm" />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Tagline</Label>
        <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Image URL</Label>
        <Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="Leave blank to use a placeholder" />
      </div>
      <Button type="submit" variant="brand" className="col-span-2" disabled={loading}>
        {loading ? "Adding..." : "Add market"}
      </Button>
    </form>
  );
}
