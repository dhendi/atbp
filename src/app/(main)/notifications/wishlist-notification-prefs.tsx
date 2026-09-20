"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tag, PackageCheck, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { updateWishlistNotificationPrefsAction } from "@/lib/actions/notifications";

interface Prefs {
  notifyWishlistPriceDrop: boolean;
  notifyWishlistRestock: boolean;
  notifyWishlistLowStock: boolean;
}

export function WishlistNotificationPrefs({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);

  async function update(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const res = await updateWishlistNotificationPrefsAction(next);
    if ("error" in res) toast.error(res.error);
  }

  return (
    <div className="mb-5 space-y-2 rounded-2xl border border-ink-200 bg-white p-4">
      <p className="text-sm font-bold text-ink-900">Wishlist notifications</p>
      <Row icon={Tag} label="Price drops on saved items" checked={prefs.notifyWishlistPriceDrop} onChange={(v) => update("notifyWishlistPriceDrop", v)} />
      <Row icon={PackageCheck} label="Saved items back in stock" checked={prefs.notifyWishlistRestock} onChange={(v) => update("notifyWishlistRestock", v)} />
      <Row icon={AlertTriangle} label="Saved items running low" checked={prefs.notifyWishlistLowStock} onChange={(v) => update("notifyWishlistLowStock", v)} />
    </div>
  );
}

function Row({ icon: Icon, label, checked, onChange }: { icon: typeof Tag; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="flex items-center gap-2 text-sm text-ink-700">
        <Icon size={14} className="text-ink-400" /> {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
