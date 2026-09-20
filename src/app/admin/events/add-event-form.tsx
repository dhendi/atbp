"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/domain/image-uploader";
import { createEventAction } from "@/lib/actions/events";

const initial = {
  name: "", description: "", eventDate: "", startTime: "", endTime: "",
  venue: "", city: "", address: "", admissionPrice: "", websiteUrl: "", categories: "", organiserName: "",
};

export function AddEventForm() {
  const [form, setForm] = useState(initial);
  const [coverImage, setCoverImage] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!coverImage[0]) { toast.error("Add a cover image."); return; }
    startTransition(async () => {
      const res = await createEventAction({
        ...form,
        coverImage: coverImage[0],
        categories: form.categories.split(",").map((c) => c.trim()).filter(Boolean),
      });
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Event created.");
      setForm(initial);
      setCoverImage([]);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Cover image</Label>
        <ImageUploader value={coverImage} onChange={setCoverImage} max={1} />
      </div>
      <Input placeholder="Event name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      <div className="grid grid-cols-3 gap-2.5">
        <Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required />
        <Input placeholder="Start time e.g. 9:00 AM" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
        <Input placeholder="End time e.g. 5:00 PM" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Input placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required />
        <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
      </div>
      <Input placeholder="Address (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <div className="grid grid-cols-2 gap-2.5">
        <Input placeholder="Admission (e.g. Free, ₱100)" value={form.admissionPrice} onChange={(e) => setForm({ ...form, admissionPrice: e.target.value })} />
        <Input placeholder="Website (optional)" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Input placeholder="Categories, comma separated" value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} />
        <Input placeholder="Organiser name" value={form.organiserName} onChange={(e) => setForm({ ...form, organiserName: e.target.value })} required />
      </div>
      <Button type="submit" variant="brand" disabled={pending}>{pending ? "Creating..." : "Create event"}</Button>
    </form>
  );
}
