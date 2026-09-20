import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";

export interface ClosetCardData {
  title: string;
  city: string | null;
  featured: boolean;
  seller: { handle: string; rating: number };
  products: { images: unknown }[];
  _count: { products: number };
}

export function ClosetCard({ closet }: { closet: ClosetCardData }) {
  const covers = closet.products.slice(0, 3).map((p) => (p.images as string[])[0]).filter(Boolean);

  return (
    <Link
      href={`/seller/${closet.seller.handle}`}
      className="w-[200px] shrink-0 overflow-hidden rounded-card border border-ink-200 bg-white transition-transform hover:-translate-y-0.5 hover:shadow-md md:w-[220px]"
    >
      <div className="grid aspect-[4/3] w-full grid-cols-3 gap-0.5 bg-ink-100">
        {covers.length > 0 ? (
          covers.map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={src} alt="" fill className="object-cover" />
            </div>
          ))
        ) : (
          <div className="col-span-3" />
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-display text-sm font-semibold text-ink-900">{closet.title}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
          {closet.city && (
            <span className="flex items-center gap-0.5"><MapPin size={11} /> {closet.city}</span>
          )}
          <span>{closet._count.products} items</span>
        </p>
        {closet.seller.rating > 0 && (
          <p className="mt-1 flex items-center gap-0.5 text-xs text-gold-600">
            <Star size={11} className="fill-gold-500 text-gold-500" /> {closet.seller.rating.toFixed(1)}
          </p>
        )}
      </div>
    </Link>
  );
}
