"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { AREA_COORDS, projectLatLng } from "@/lib/local-shared";

export interface MapPinData {
  id: string;
  label: string;
  href: string;
  lat?: number | null;
  lng?: number | null;
  area: string;
  kind: "seller";
}

export function LocalPinMap({ pins, area }: { pins: MapPinData[]; area: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const areaCoord = AREA_COORDS[area as keyof typeof AREA_COORDS];

  // Fall back to the area's rough centroid, jittered slightly per pin, when a
  // seller hasn't set exact coordinates — keeps the map useful without
  // forcing every seller to pin an exact location.
  const placed = pins.map((p, i) => {
    const hasCoords = typeof p.lat === "number" && typeof p.lng === "number";
    // Scatter pins lacking exact coordinates around the area's centroid using
    // golden-angle spacing, so they fan out visibly instead of clustering
    // into overlapping grid cells.
    const angle = i * 137.5 * (Math.PI / 180);
    const radius = 0.25 + i * 0.05;
    const lat = hasCoords ? (p.lat as number) : (areaCoord?.lat ?? 12.8) + Math.sin(angle) * radius;
    const lng = hasCoords ? (p.lng as number) : (areaCoord?.lng ?? 121.8) + Math.cos(angle) * radius;
    return { ...p, ...projectLatLng(lat, lng) };
  });

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card border border-ink-200 bg-ink-50">
      <div className="weave-texture absolute inset-0 opacity-40" />
      {placed.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-ink-400">
          No pinned locations in {area} yet.
        </div>
      ) : (
        placed.map((p) => (
          <Link
            key={`${p.kind}-${p.id}`}
            href={p.href}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            className="group absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
          >
            <MapPin size={26} className="fill-ink-900 text-ink-900 drop-shadow transition-transform group-hover:scale-110" />
            <span
              className={cn(
                "absolute left-1/2 top-full mt-1 w-max max-w-[160px] -translate-x-1/2 truncate rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-semibold text-white transition-opacity",
                hovered === p.id ? "opacity-100" : "opacity-0"
              )}
            >
              {p.label}
            </span>
          </Link>
        ))
      )}
      <p className="absolute bottom-2 right-3 text-[10px] text-ink-400">Approximate positions, not to scale</p>
    </div>
  );
}
