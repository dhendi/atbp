"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShopHoursEditor, defaultHours } from "@/components/domain/shop-hours-editor";
import { PhLocationPicker } from "@/components/domain/ph-location-picker";
import { addSellerLocationAction, updateSellerLocationAction, deleteSellerLocationAction, type ShopHoursInput } from "@/lib/actions/local";

interface LocationData {
  id: string;
  label: string;
  province: string;
  publicAddress: string | null;
  showExactAddress: boolean;
  pickupAvailable: boolean;
  pickupInstructions: string | null;
  hours: ShopHoursInput[];
}

interface FormState {
  label: string;
  province: string;
  publicAddress: string;
  showExactAddress: boolean;
  pickupAvailable: boolean;
  pickupInstructions: string;
  hours: ShopHoursInput[];
}

function toFormState(loc?: LocationData): FormState {
  return {
    label: loc?.label ?? "",
    province: loc?.province ?? "Metro Manila",
    publicAddress: loc?.publicAddress ?? "",
    showExactAddress: loc?.showExactAddress ?? false,
    pickupAvailable: loc?.pickupAvailable ?? false,
    pickupInstructions: loc?.pickupInstructions ?? "",
    hours: loc && loc.hours.length === 7 ? loc.hours : defaultHours(),
  };
}

export function MultiLocationManager({ locations }: { locations: LocationData[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(toFormState());
  const [loading, setLoading] = useState(false);

  function openAdd() {
    setEditingId(null);
    setForm(toFormState());
    setOpen(true);
  }

  function openEdit(loc: LocationData) {
    setEditingId(loc.id);
    setForm(toFormState(loc));
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = editingId ? await updateSellerLocationAction(editingId, form) : await addSellerLocationAction(form);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success(editingId ? "Location updated" : "Location added");
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await deleteSellerLocationAction(id);
    if ("error" in res) return toast.error(res.error);
    toast.success("Location removed");
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-3 rounded-2xl border border-ink-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-ink-900">Your locations</p>
          <p className="text-xs text-ink-500">Each branch gets its own area, address privacy, pickup option, and hours.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={openAdd}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {locations.length === 0 ? (
        <p className="rounded-xl bg-ink-50 p-3 text-xs text-ink-500">No additional locations yet. Add your first branch.</p>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between gap-2 rounded-xl border border-ink-100 p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ink-900">
                  <MapPin size={13} className="shrink-0 text-brand-600" /> {loc.label}
                </p>
                <p className="truncate text-xs text-ink-500">{loc.showExactAddress && loc.publicAddress ? loc.publicAddress : loc.province}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${loc.label}`} onClick={() => openEdit(loc)}>
                  <Pencil size={14} />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${loc.label}`} onClick={() => handleDelete(loc.id)}>
                  <Trash2 size={14} className="text-live-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit location" : "Add location"}</DialogTitle>
            <DialogDescription>This branch&apos;s own area, address privacy, pickup option, and hours.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Main Branch, Weekend Stall" required />
            </div>
            <div className="space-y-1.5">
              <Label>Area</Label>
              <PhLocationPicker value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-ink-200 p-3">
              <p className="text-sm font-semibold text-ink-800">Show exact address</p>
              <Switch checked={form.showExactAddress} onCheckedChange={(v) => setForm({ ...form, showExactAddress: v })} />
            </div>
            {form.showExactAddress && (
              <div className="space-y-1.5">
                <Label>Public address</Label>
                <Input value={form.publicAddress} onChange={(e) => setForm({ ...form, publicAddress: e.target.value })} />
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-ink-200 p-3">
              <p className="text-sm font-semibold text-ink-800">Offer pickup here</p>
              <Switch checked={form.pickupAvailable} onCheckedChange={(v) => setForm({ ...form, pickupAvailable: v })} />
            </div>
            {form.pickupAvailable && (
              <div className="space-y-1.5">
                <Label>Pickup instructions</Label>
                <Textarea value={form.pickupInstructions} onChange={(e) => setForm({ ...form, pickupInstructions: e.target.value })} maxLength={400} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Hours</Label>
              <ShopHoursEditor hours={form.hours} onChange={(hours) => setForm({ ...form, hours })} />
            </div>

            <Button type="submit" variant="brand" className="w-full" disabled={loading}>
              {loading ? "Saving..." : editingId ? "Save Changes" : "Add Location"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
