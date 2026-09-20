import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock } from "lucide-react";

export interface YardSaleCardData {
  title: string;
  city: string | null;
  endDate: Date | string;
  seller: { handle: string };
  products: { images: unknown }[];
  _count: { products: number };
}

export function YardSaleCard({ yardSale }: { yardSale: YardSaleCardData }) {
  const cover = (yardSale.products[0]?.images as string[] | undefined)?.[0];
  const endsAt = new Date(yardSale.endDate);
  const hoursLeft = Math.max(0, Math.round((endsAt.getTime() - Date.now()) / 3600000));

  return (
    <Link
      href={`/seller/${yardSale.seller.handle}`}
      className="w-[200px] shrink-0 overflow-hidden rounded-card border border-ink-200 bg-white transition-transform hover:-translate-y-0.5 hover:shadow-md md:w-[220px]"
    >
      <div className="relative aspect-[4/3] w-full bg-ink-100">
        {cover && <Image src={cover} alt="" fill className="object-cover" />}
      </div>
      <div className="p-3">
        <p className="truncate font-display text-sm font-semibold text-ink-900">{yardSale.title}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
          {yardSale.city && (
            <span className="flex items-center gap-0.5"><MapPin size={11} /> {yardSale.city}</span>
          )}
          <span>{yardSale._count.products} items</span>
        </p>
        {hoursLeft <= 48 && (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-live-600">
            <Clock size={11} /> Ends in {hoursLeft}h
          </p>
        )}
      </div>
    </Link>
  );
}
