"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PH_LOCATIONS } from "@/lib/local-shared";
import { cn } from "@/lib/utils";

/** Region -> province -> city cascade for picking several areas at once
 * (e.g. "areas you deliver to"). Narrow down to a province, then toggle any
 * number of its cities on; picks accumulate as removable chips below,
 * across as many region/province visits as needed. */
export function PhLocationMultiPicker({
  values,
  onChange,
  className,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  className?: string;
}) {
  const [regionName, setRegionName] = useState<string | null>(null);
  const [provinceName, setProvinceName] = useState<string | null>(null);

  const region = PH_LOCATIONS.find((r) => r.name === regionName);
  const province = region?.provinces.find((p) => p.name === provinceName);

  function toggle(city: string) {
    onChange(values.includes(city) ? values.filter((v) => v !== city) : [...values, city]);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select
          value={regionName ?? undefined}
          onValueChange={(name) => {
            setRegionName(name);
            setProvinceName(null);
          }}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            {PH_LOCATIONS.map((r) => (
              <SelectItem key={r.code} value={r.name}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={provinceName ?? undefined} onValueChange={setProvinceName} disabled={!region}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Province" /></SelectTrigger>
          <SelectContent>
            {(region?.provinces ?? []).map((p) => (
              <SelectItem key={p.code} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {province && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-ink-100 bg-ink-50 p-2.5">
          {province.cities.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => toggle(c.name)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                values.includes(c.name) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-600"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {values.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">Selected areas ({values.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {values.map((v) => (
              <span key={v} className="flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-brand-700">
                {v}
                <button type="button" onClick={() => toggle(v)} aria-label={`Remove ${v}`} className="rounded-full p-0.5 hover:bg-brand-100">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
