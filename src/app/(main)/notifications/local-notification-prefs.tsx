"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, CalendarDays, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { updateNotificationPrefsAction } from "@/lib/actions/local";

interface Prefs {
  notifyLocalDrops: boolean;
  notifyLocalEvents: boolean;
  notifyNearbySellers: boolean;
}

export function LocalNotificationPrefs({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);

  async function update(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const res = await updateNotificationPrefsAction(next);
    if ("error" in res) toast.error(res.error);
  }

  return (
    <div className="mb-5 space-y-2 rounded-2xl border border-ink-200 bg-white p-4">
      <p className="text-sm font-bold text-ink-900">Local notifications</p>
      <Row icon={Sparkles} label="Drops from sellers near me" checked={prefs.notifyLocalDrops} onChange={(v) => update("notifyLocalDrops", v)} />
      <Row icon={CalendarDays} label="Events happening near me" checked={prefs.notifyLocalEvents} onChange={(v) => update("notifyLocalEvents", v)} />
      <Row icon={MapPin} label="New sellers joining my area" checked={prefs.notifyNearbySellers} onChange={(v) => update("notifyNearbySellers", v)} />
    </div>
  );
}

function Row({ icon: Icon, label, checked, onChange }: { icon: typeof Sparkles; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="flex items-center gap-2 text-sm text-ink-700">
        <Icon size={14} className="text-ink-400" /> {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
