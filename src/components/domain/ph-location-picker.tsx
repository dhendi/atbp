"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin, Navigation, ChevronLeft, ChevronRight, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PH_LOCATIONS, nearestArea } from "@/lib/local-shared";
import { cn } from "@/lib/utils";

interface FlatCity {
  cityName: string;
  provinceName: string;
  regionName: string;
}

const FLAT_CITIES: FlatCity[] = PH_LOCATIONS.flatMap((r) =>
  r.provinces.flatMap((p) => p.cities.map((c) => ({ cityName: c.name, provinceName: p.name, regionName: r.name })))
);

/** Search + "use my location" + region -> province -> city drill-down, one
 * level visible at a time instead of three stacked dropdowns — the dropdowns
 * used to clip/overflow their card on mobile and had no quick way to jump
 * straight to a city. This is the shared list body; PhLocationPicker and
 * AreaPicker each wrap it in their own trigger + Dialog. */
export function LocationListPicker({
  value, onChange, disabled, onPicked,
}: {
  value: string | null;
  onChange: (city: string) => void;
  disabled?: boolean;
  /** Called right after a city is chosen, so a caller can close its own dialog. */
  onPicked?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [regionName, setRegionName] = useState<string | null>(null);
  const [provinceName, setProvinceName] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const region = PH_LOCATIONS.find((r) => r.name === regionName) ?? null;
  const province = region?.provinces.find((p) => p.name === provinceName) ?? null;

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return FLAT_CITIES.filter((c) => c.cityName.toLowerCase().includes(q)).slice(0, 50);
  }, [query]);

  function pick(city: string) {
    onChange(city);
    onPicked?.();
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        pick(nearestArea(pos.coords.latitude, pos.coords.longitude));
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Pick a city instead.");
      },
      { timeout: 8000 }
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city or municipality"
          className="pl-9"
          disabled={disabled}
        />
      </div>

      {!query && (
        <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={useMyLocation} disabled={disabled || locating}>
          <Navigation size={15} />
          {locating ? "Finding you..." : "Use my current location"}
        </Button>
      )}

      {searchResults ? (
        <div className="max-h-72 divide-y divide-ink-100 overflow-y-auto rounded-xl border border-ink-100">
          {searchResults.length === 0 ? (
            <p className="p-3 text-sm text-ink-400">No matches.</p>
          ) : (
            searchResults.map((c) => (
              <button
                key={c.cityName}
                type="button"
                disabled={disabled}
                onClick={() => pick(c.cityName)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-ink-50",
                  value === c.cityName && "bg-brand-50"
                )}
              >
                <span className="min-w-0">
                  <span className="font-semibold text-ink-900">{c.cityName}</span>
                  <span className="ml-1.5 text-xs text-ink-400">{c.provinceName} · {c.regionName}</span>
                </span>
                {value === c.cityName && <Check size={14} className="shrink-0 text-brand-600" />}
              </button>
            ))
          )}
        </div>
      ) : province ? (
        <div className="rounded-xl border border-ink-100">
          <button
            type="button"
            onClick={() => setProvinceName(null)}
            className="flex w-full items-center gap-1.5 border-b border-ink-100 px-3.5 py-2.5 text-left text-xs font-bold text-ink-500 hover:bg-ink-50"
          >
            <ChevronLeft size={14} /> {region?.name}
          </button>
          <div className="max-h-72 divide-y divide-ink-100 overflow-y-auto">
            {province.cities.map((c) => (
              <button
                key={c.code}
                type="button"
                disabled={disabled}
                onClick={() => pick(c.name)}
                className={cn(
                  "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-ink-50",
                  value === c.name && "bg-brand-50 font-semibold text-brand-700"
                )}
              >
                {c.name}
                {value === c.name && <Check size={14} className="shrink-0 text-brand-600" />}
              </button>
            ))}
          </div>
        </div>
      ) : region ? (
        <div className="rounded-xl border border-ink-100">
          <button
            type="button"
            onClick={() => setRegionName(null)}
            className="flex w-full items-center gap-1.5 border-b border-ink-100 px-3.5 py-2.5 text-left text-xs font-bold text-ink-500 hover:bg-ink-50"
          >
            <ChevronLeft size={14} /> All regions
          </button>
          <div className="max-h-72 divide-y divide-ink-100 overflow-y-auto">
            {region.provinces.map((p) => (
              <button
                key={p.code}
                type="button"
                disabled={disabled}
                onClick={() => setProvinceName(p.name)}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-ink-50"
              >
                {p.name}
                <ChevronRight size={14} className="shrink-0 text-ink-300" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-h-72 divide-y divide-ink-100 overflow-y-auto rounded-xl border border-ink-100">
          {PH_LOCATIONS.map((r) => (
            <button
              key={r.code}
              type="button"
              disabled={disabled}
              onClick={() => setRegionName(r.name)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-ink-50"
            >
              {r.name}
              <ChevronRight size={14} className="shrink-0 text-ink-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Single-value city picker — a trigger button that opens a searchable
 * Dialog (search, "use my current location", or browse region -> province ->
 * city) instead of three stacked cascading dropdowns. */
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50",
          value ? "text-ink-900" : "text-ink-400",
          className
        )}
      >
        <MapPin size={15} className="shrink-0 text-ink-400" />
        <span className="min-w-0 flex-1 truncate">{value ?? "Choose your city"}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose your area</DialogTitle>
            <DialogDescription>Search, use your current location, or browse by region.</DialogDescription>
          </DialogHeader>
          <LocationListPicker value={value} onChange={onChange} disabled={disabled} onPicked={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
