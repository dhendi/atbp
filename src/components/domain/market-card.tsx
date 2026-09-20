import Image from "next/image";
import { MapPin, Calendar } from "lucide-react";

export interface MarketCardData {
  id: string;
  name: string;
  city: string;
  tagline: string | null;
  imageUrl: string;
  schedule: string | null;
}

export function MarketCard({ market }: { market: MarketCardData }) {
  return (
    <div className="relative w-[260px] shrink-0 overflow-hidden rounded-card md:w-[300px]">
      <div className="relative aspect-[4/5]">
        <Image src={market.imageUrl} alt={market.name} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/10 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-white/80">
          <MapPin size={11} /> {market.city}
        </p>
        <p className="font-display mt-1 text-lg font-semibold leading-tight">{market.name}</p>
        {market.tagline && <p className="mt-1 text-xs text-white/80 line-clamp-2">{market.tagline}</p>}
        {market.schedule && (
          <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-white/90">
            <Calendar size={11} /> {market.schedule}
          </p>
        )}
      </div>
    </div>
  );
}
