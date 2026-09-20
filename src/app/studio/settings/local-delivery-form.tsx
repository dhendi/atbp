"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PhLocationMultiPicker } from "@/components/domain/ph-location-multi-picker";
import { updateSellerLocalDeliveryAction } from "@/lib/actions/local";

interface LocalDeliverySettings {
  localDeliveryAvailable: boolean;
  localDeliveryFee: string;
  localDeliveryAreas: string[];
}

export function LocalDeliveryForm({ initial }: { initial: LocalDeliverySettings }) {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await updateSellerLocalDeliveryAction({
      localDeliveryAvailable: form.localDeliveryAvailable,
      localDeliveryFee: form.localDeliveryFee ? Number(form.localDeliveryFee) : undefined,
      localDeliveryAreas: form.localDeliveryAreas,
    });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Local delivery settings saved");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl border border-ink-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike size={16} className="text-brand-600" />
          <div>
            <p className="text-sm font-bold text-ink-900">Deliver locally yourself</p>
            <p className="text-xs text-ink-500">Skip the courier and bring orders directly to buyers in areas you choose.</p>
          </div>
        </div>
        <Switch checked={form.localDeliveryAvailable} onCheckedChange={(v) => setForm({ ...form, localDeliveryAvailable: v })} />
      </div>

      {form.localDeliveryAvailable && (
        <>
          <div className="space-y-1.5">
            <Label>Delivery fee (₱, optional)</Label>
            <Input
              type="number"
              min={0}
              value={form.localDeliveryFee}
              onChange={(e) => setForm({ ...form, localDeliveryFee: e.target.value })}
              placeholder="Leave blank for free delivery"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Areas you deliver to</Label>
            <PhLocationMultiPicker
              values={form.localDeliveryAreas}
              onChange={(localDeliveryAreas) => setForm({ ...form, localDeliveryAreas })}
            />
          </div>
        </>
      )}

      <Button type="submit" variant="brand" size="sm" disabled={loading}>
        {loading ? "Saving..." : "Save Local Delivery"}
      </Button>
    </form>
  );
}
