// Pure helpers/constants for the Local feature — safe to import from client
// components. Anything touching cookies() or prisma lives in
// lib/services/local.ts instead, since next/headers taints a module for
// client bundles.

import phLocationsData from "@/lib/data/ph-locations.json";

export interface PhCity {
  code: string;
  name: string;
}
export interface PhProvince {
  code: string;
  name: string;
  cities: PhCity[];
}
export interface PhRegion {
  code: string;
  name: string;
  provinces: PhProvince[];
}

// The full PSGC (Philippine Standard Geographic Code) hierarchy — every
// region, its provinces, and every city/municipality in each province —
// generated once from https://psgc.gitlab.io/api (regions/provinces/
// cities-municipalities) by scripts/generate-ph-locations.js and checked in
// as static data since it only changes when PSA revises the PSGC. NCR has no
// real provinces, so its 17 cities sit under one "Metro Manila" bucket
// rather than exposing legislative districts nobody addresses mail by; a
// couple of highly-urbanized cities outside NCR (Cotabato City, Isabela
// City) are likewise province-independent and get their own single-city
// bucket within their region.
export const PH_LOCATIONS = phLocationsData as PhRegion[];

// Flat list of every selectable city/municipality name — the pre-existing
// shape most call sites (province fields, DB matching) still just need.
export const AREAS: string[] = PH_LOCATIONS.flatMap((r) => r.provinces.flatMap((p) => p.cities.map((c) => c.name)));
const AREA_SET = new Set(AREAS);

export function isValidArea(value: string): boolean {
  return AREA_SET.has(value);
}

/** Where a city sits in the region/province hierarchy — used to preselect a cascading picker around an existing value (e.g. editing a pickup location). */
export function findAreaLocation(cityName: string): { region: string; province: string } | null {
  for (const r of PH_LOCATIONS) {
    for (const p of r.provinces) {
      if (p.cities.some((c) => c.name === cityName)) return { region: r.name, province: p.name };
    }
  }
  return null;
}

export const AREA_COOKIE = "atbp_area";

// Rough centroid for well-known cities only — one per region, roughly, plus
// a few extra Metro Manila landmarks. We don't have coordinates for all
// 1,600+ municipalities; this is used only for "Use my location" ->
// nearest-known-city matching, never for the picker itself, and callers
// (LocalPinMap) already fall back gracefully when a city isn't in this list.
export const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  "Metro Manila": { lat: 14.5995, lng: 120.9842 },
  "Quezon City": { lat: 14.676, lng: 121.0437 },
  "Manila City": { lat: 14.5995, lng: 120.9842 },
  "Makati City": { lat: 14.5547, lng: 121.0244 },
  "Pasig City": { lat: 14.5764, lng: 121.0851 },
  "Taguig City": { lat: 14.5176, lng: 121.0509 },
  "Parañaque City": { lat: 14.4793, lng: 121.0198 },
  "Cavite City": { lat: 14.4297, lng: 120.9367 },
  Bulacan: { lat: 14.8433, lng: 120.8113 },
  "Santa Rosa City": { lat: 14.2117, lng: 121.1653 },
  "Cebu City": { lat: 10.3157, lng: 123.8854 },
  "Davao City": { lat: 7.1907, lng: 125.4553 },
  "Iloilo City": { lat: 10.7202, lng: 122.5621 },
  "Baguio City": { lat: 16.4023, lng: 120.596 },
  "Vigan City": { lat: 17.5747, lng: 120.3869 },
  "Bacolod City": { lat: 10.6407, lng: 122.9689 },
  "Cagayan De Oro City": { lat: 8.4822, lng: 124.6472 },
  "Zamboanga City": { lat: 6.9214, lng: 122.079 },
  "Tacloban City": { lat: 11.2543, lng: 125.0 },
  "Legazpi City": { lat: 13.1391, lng: 123.7438 },
  "Puerto Princesa City": { lat: 9.7392, lng: 118.7353 },
  "Cotabato City": { lat: 7.2231, lng: 124.2452 },
  "General Santos City": { lat: 6.1164, lng: 125.1716 },
  "Butuan City": { lat: 8.9475, lng: 125.5406 },
  "Tuguegarao City": { lat: 17.6132, lng: 121.7269 },
};

/** Nearest known city to a lat/lng, for the optional "Use my location" convenience — never required.
 * Only searches AREA_COORDS (a curated ~25 well-known cities), not the full 1,635-city AREAS list —
 * we don't have coordinates for every municipality, so this is a "close enough" match, not precise geocoding. */
export function nearestArea(lat: number, lng: number): string {
  let best = "Metro Manila";
  let bestDist = Infinity;
  for (const [area, c] of Object.entries(AREA_COORDS)) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = area;
    }
  }
  return best;
}

// Rough bounding box for the Philippines, used only to place approximate pins
// on the simple abstract map view — not real geographic projection.
const PH_BOUNDS = { minLat: 4.5, maxLat: 21, minLng: 116, maxLng: 127 };

/** Projects a lat/lng into a 0-100 percentage pair for absolute-positioned pins. */
export function projectLatLng(lat: number, lng: number): { xPct: number; yPct: number } {
  const xPct = ((lng - PH_BOUNDS.minLng) / (PH_BOUNDS.maxLng - PH_BOUNDS.minLng)) * 100;
  const yPct = (1 - (lat - PH_BOUNDS.minLat) / (PH_BOUNDS.maxLat - PH_BOUNDS.minLat)) * 100;
  return { xPct: Math.min(97, Math.max(3, xPct)), yPct: Math.min(97, Math.max(3, yPct)) };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${suffix}`;
}

export type ShopHoursRow = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  closed: boolean;
  open24h: boolean;
  byAppointment: boolean;
};

/** Computes a human "Open now" / "Opens tomorrow at 9:00 AM" style status from a seller's weekly hours. */
export function getShopStatus(
  hours: ShopHoursRow[],
  temporarilyClosed: boolean,
  now: Date = new Date()
): { isOpen: boolean | null; label: string | null } {
  if (temporarilyClosed) return { isOpen: false, label: "Temporarily closed" };
  if (!hours.length) return { isOpen: null, label: null };

  const day = now.getDay();
  const today = hours.find((h) => h.dayOfWeek === day);

  function nextOpenDayLabel(): { isOpen: false; label: string } {
    for (let i = 1; i <= 7; i++) {
      const nextDay = (day + i) % 7;
      const nd = hours.find((h) => h.dayOfWeek === nextDay);
      if (nd && !nd.closed) {
        const dayLabel = i === 1 ? "tomorrow" : DAY_NAMES[nextDay];
        if (nd.byAppointment) return { isOpen: false, label: "By appointment" };
        if (nd.open24h) return { isOpen: false, label: `Opens ${dayLabel}` };
        if (nd.opensAt) return { isOpen: false, label: `Opens ${dayLabel} at ${formatTime(nd.opensAt)}` };
        return { isOpen: false, label: `Opens ${dayLabel}` };
      }
    }
    return { isOpen: false, label: "Closed" };
  }

  if (!today || today.closed) return nextOpenDayLabel();
  if (today.byAppointment) return { isOpen: null, label: "By appointment" };
  if (today.open24h) return { isOpen: true, label: "Open 24 hours" };
  if (!today.opensAt || !today.closesAt) return { isOpen: null, label: null };

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = today.opensAt.split(":").map(Number);
  const [ch, cm] = today.closesAt.split(":").map(Number);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;

  if (nowMinutes >= openMinutes && nowMinutes < closeMinutes) {
    return { isOpen: true, label: `Open now · closes ${formatTime(today.closesAt)}` };
  }
  if (nowMinutes < openMinutes) {
    return { isOpen: false, label: `Opens today at ${formatTime(today.opensAt)}` };
  }
  return nextOpenDayLabel();
}

/** Privacy-safe public location label — never reveals an exact address unless the seller opted in. */
export function getPublicLocationLabel(seller: {
  province: string | null;
  publicAddress: string | null;
  showExactAddress: boolean;
}): string | null {
  if (seller.showExactAddress && seller.publicAddress) return seller.publicAddress;
  return seller.province ?? null;
}
