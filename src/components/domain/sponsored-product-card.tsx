import Image from "next/image";
import { formatPeso } from "@/lib/utils";

export interface SponsoredCardData {
  promotionId: string;
  productId: string;
  title: string;
  price: number;
  image: string;
  shopName: string;
}

/**
 * Deliberately its own component rather than reusing ProductCard — a
 * promoted card only ever needs image/title/price/seller plus an explicit
 * "Sponsored" label, and routing its click through /api/promotions/[id]/click
 * (for real click counting) doesn't belong bolted onto the shared card used
 * everywhere else in the app.
 */
export function SponsoredProductCard({ data }: { data: SponsoredCardData }) {
  return (
    <a href={`/api/promotions/${data.promotionId}/click`} className="group block w-[168px] shrink-0 md:w-[200px]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-ink-100">
        <Image
          src={data.image}
          alt={data.title}
          fill
          sizes="(max-width: 768px) 50vw, 280px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          Sponsored
        </span>
      </div>
      <div className="mt-2 space-y-0.5">
        <p className="truncate text-sm font-semibold text-ink-900">{data.title}</p>
        <p className="text-sm font-bold tracking-tight text-ink-900">{formatPeso(data.price)}</p>
        <p className="truncate text-xs text-ink-500">{data.shopName}</p>
      </div>
    </a>
  );
}
