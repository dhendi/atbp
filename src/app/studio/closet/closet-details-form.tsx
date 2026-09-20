"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateClosetAction } from "@/lib/actions/closet";

export function ClosetDetailsForm({ initial }: { initial: { title: string; city: string; description: string } }) {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await updateClosetAction({ title: form.title, city: form.city, description: form.description });
    setLoading(false);
    if ("error" in res && res.error) return toast.error(res.error);
    toast.success("Closet details saved");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-card border border-ink-100 bg-white p-4">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="space-y-1.5">
        <Label>City</Label>
        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={loading}>{loading ? "Saving..." : "Save Details"}</Button>
    </form>
  );
}
