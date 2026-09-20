"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Home, Store, Tent, Wrench, Building2, Layers, Globe as OnlineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { updateSellerLocalSettingsAction, type ShopHoursInput } from "@/lib/actions/local";
import { ShopHoursEditor, defaultHours } from "@/components/domain/shop-hours-editor";

const PRESENCE_OPTIONS = [
  { value: "ONLINE_ONLY", label: "Online only", icon: OnlineIcon },
  { value: "HOME_STUDIO", label: "Home / studio", icon: Home },
  { value: "PHYSICAL_STORE", label: "Physical store", icon: Store },
  { value: "MARKET_VENDOR", label: "Market vendor", icon: Tent },
  { value: "WORKSHOP", label: "Workshop", icon: Wrench },
  { value: "MULTIPLE_LOCATIONS", label: "Multiple locations", icon: Layers },
];

interface LocalSettings {
  physicalPresence: string;
  publicAddress: string;
  showExactAddress: boolean;
  pickupAvailable: boolean;
  pickupInstructions: string;
  temporarilyClosed: boolean;
  hours: ShopHoursInput[];
}

export function LocalSettingsForm({
  initial, isCasualSeller,
}: {
  initial: LocalSettings;
  /** Casual (Closet/Yard Sale) sellers can't be birVerified — see
   * createProductAction — so this decides the pickup toggle's label: "Store
   * Pickup" for a BIR-verified Shop, "Local Pickup" for a casual seller. */
  isCasualSeller: boolean;
}) {
  const [form, setForm] = useState<LocalSettings>({
    ...initial,
    hours: initial.hours.length === 7 ? initial.hours : defaultHours(),
  });
  const [loading, setLoading] = useState(false);

  const hasPhysicalPresence = form.physicalPresence !== "ONLINE_ONLY";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await updateSellerLocalSettingsAction(form);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Local settings saved");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      <div className="space-y-2">
        <Label>Shop type</Label>
        <p className="text-xs text-ink-400">This shapes what buyers see about where to find you. It&apos;s not shown as a private address unless you choose to.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESENCE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = form.physicalPresence === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, physicalPresence: opt.value })}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-colors",
                  active ? "border-brand-500 bg-brand-50" : "border-ink-200"
                )}
              >
                <Icon size={16} className={active ? "text-brand-600" : "text-ink-500"} />
                <span className="text-xs font-semibold text-ink-800">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {hasPhysicalPresence && (
        <>
          <div className="space-y-3 rounded-2xl border border-ink-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink-900">Show exact address</p>
                <p className="text-xs text-ink-500">
                  Off by default. Buyers will just see your area (e.g. &ldquo;Quezon City, Metro Manila&rdquo;) until you turn this on.
                </p>
              </div>
              <Switch checked={form.showExactAddress} onCheckedChange={(v) => setForm({ ...form, showExactAddress: v })} />
            </div>
            {form.showExactAddress && (
              <div className="space-y-1.5">
                <Label>Public address</Label>
                <Input
                  value={form.publicAddress}
                  onChange={(e) => setForm({ ...form, publicAddress: e.target.value })}
                  placeholder="e.g. Unit 4B, 123 Maginhawa St, Quezon City"
                />
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-ink-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink-900">Offer {isCasualSeller ? "local pickup" : "store pickup"}</p>
                <p className="text-xs text-ink-500">Let buyers near you arrange to pick up orders in person.</p>
              </div>
              <Switch checked={form.pickupAvailable} onCheckedChange={(v) => setForm({ ...form, pickupAvailable: v })} />
            </div>
            {form.pickupAvailable && (
              <div className="space-y-1.5">
                <Label>Pickup instructions</Label>
                <Textarea
                  value={form.pickupInstructions}
                  onChange={(e) => setForm({ ...form, pickupInstructions: e.target.value })}
                  placeholder="e.g. Message me to arrange a time. Pickup available weekdays 6-9PM."
                  maxLength={400}
                />
                <p className="text-xs text-ink-400">Exact meeting details are best kept for after an order is confirmed. This is just the general arrangement.</p>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-ink-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink-900">Temporarily closed</p>
                <p className="text-xs text-ink-500">Pause your &ldquo;open now&rdquo; status without changing your hours below.</p>
              </div>
              <Switch checked={form.temporarilyClosed} onCheckedChange={(v) => setForm({ ...form, temporarilyClosed: v })} />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-ink-200 p-4">
            <p className="text-sm font-bold text-ink-900">Store hours</p>
            <ShopHoursEditor hours={form.hours} onChange={(hours) => setForm({ ...form, hours })} />
          </div>
        </>
      )}

      <Button type="submit" variant="brand" disabled={loading}>
        {loading ? "Saving..." : "Save Local Settings"}
      </Button>
    </form>
  );
}
