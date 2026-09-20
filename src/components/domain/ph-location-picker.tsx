"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PH_LOCATIONS, findAreaLocation } from "@/lib/local-shared";
import { cn } from "@/lib/utils";

/** Region -> province -> city cascading picker for a single area value. Each
 * step only shows options within the one chosen above it, so it stays usable
 * with the full ~1,635-city PH dataset instead of one giant flat list. */
export function PhLocationPicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string | null;
  onChange: (city: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const initial = value ? findAreaLocation(value) : null;
  const [regionName, setRegionName] = useState<string | null>(initial?.region ?? null);
  const [provinceName, setProvinceName] = useState<string | null>(initial?.province ?? null);
  const [cityName, setCityName] = useState<string | null>(value);

  const region = PH_LOCATIONS.find((r) => r.name === regionName);
  const province = region?.provinces.find((p) => p.name === provinceName);

  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-3", className)}>
      <Select
        value={regionName ?? undefined}
        onValueChange={(name) => {
          setRegionName(name);
          setProvinceName(null);
          setCityName(null);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-full"><SelectValue placeholder="Region" /></SelectTrigger>
        <SelectContent>
          {PH_LOCATIONS.map((r) => (
            <SelectItem key={r.code} value={r.name}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={provinceName ?? undefined}
        onValueChange={(name) => {
          setProvinceName(name);
          setCityName(null);
        }}
        disabled={disabled || !region}
      >
        <SelectTrigger className="w-full"><SelectValue placeholder="Province" /></SelectTrigger>
        <SelectContent>
          {(region?.provinces ?? []).map((p) => (
            <SelectItem key={p.code} value={p.name}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={cityName ?? undefined}
        onValueChange={(name) => {
          setCityName(name);
          onChange(name);
        }}
        disabled={disabled || !province}
      >
        <SelectTrigger className="w-full"><SelectValue placeholder="City" /></SelectTrigger>
        <SelectContent>
          {(province?.cities ?? []).map((c) => (
            <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
