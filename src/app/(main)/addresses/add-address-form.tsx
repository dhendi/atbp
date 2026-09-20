"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAddressAction } from "@/lib/actions/addresses";

export function AddAddressForm() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", phone: "", line1: "", city: "", province: "", postalCode: "" });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await addAddressAction(form);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Address saved");
    setForm({ fullName: "", phone: "", line1: "", city: "", province: "", postalCode: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1.5">
        <Label>Full name</Label>
        <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Phone number</Label>
        <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+639171234567" required />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Street address</Label>
        <Input value={form.line1} onChange={(e) => set("line1", e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>City / Municipality</Label>
        <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Province</Label>
        <Input value={form.province} onChange={(e) => set("province", e.target.value)} required />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>Postal code</Label>
        <Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} required />
      </div>
      <Button type="submit" variant="brand" className="col-span-2" disabled={loading}>
        {loading ? "Saving..." : "Save address"}
      </Button>
    </form>
  );
}
