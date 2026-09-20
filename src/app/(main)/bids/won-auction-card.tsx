import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/utils";

export function WonAuctionCard({
  product,
}: {
  product: { id: string; title: string; image: string; shopName: string; currentBid: number; purchased: boolean };
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-brand-200 bg-brand-50 p-3.5">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-100">
        <Image src={product.image} alt={product.title} fill className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-900">{product.title}</p>
        <p className="text-xs text-ink-500">{product.shopName}</p>
        <p className="font-tag text-sm font-bold text-ink-900">{formatPeso(product.currentBid)}</p>
      </div>
      {product.purchased ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-success-500">
          <CheckCircle2 size={14} /> Paid
        </span>
      ) : (
        <Button size="sm" variant="brand" asChild className="shrink-0">
          <Link href={`/bids/${product.id}/checkout`}>Complete Purchase</Link>
        </Button>
      )}
    </div>
  );
}
