"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPeso } from "@/lib/utils";
import { respondToCounterAction } from "@/lib/actions/tawad";

interface OfferData {
  id: string;
  amount: number;
  counterAmount: number | null;
  status: string;
  reservedUntil: string | null;
  product: { id: string; title: string; image: string | undefined; listedPrice: number };
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Waiting on seller",
  COUNTERED: "Seller countered",
  ACCEPTED: "Accepted: complete checkout",
  DECLINED: "Declined",
  AUTO_DECLINED: "Declined",
  EXPIRED: "Expired",
  LAPSED: "Reservation lapsed",
};

const STATUS_VARIANT: Record<string, "success" | "subtle" | "live" | "outline"> = {
  PENDING: "live",
  COUNTERED: "outline",
  ACCEPTED: "success",
};

function hoursLeft(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3600000));
}

export function MyOfferRow({ offer }: { offer: OfferData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function respond(action: "ACCEPT" | "DECLINE") {
    setLoading(true);
    const res = await respondToCounterAction(offer.id, action);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success(action === "ACCEPT" ? "Counter accepted!" : "Counter declined");
    router.refresh();
  }

  const left = offer.status === "ACCEPTED" ? hoursLeft(offer.reservedUntil) : null;

  return (
    <div className="rounded-card border border-ink-100 bg-white p-3.5">
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
          {offer.product.image && <Image src={offer.product.image} alt={offer.product.title} fill className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/product/${offer.product.id}`} className="truncate text-sm font-bold text-ink-900 hover:underline">
            {offer.product.title}
          </Link>
          <p className="mt-1 text-sm">
            {offer.status === "COUNTERED" ? (
              <>You offered <s className="text-ink-400">{formatPeso(offer.amount)}</s>, the seller countered {formatPeso(offer.counterAmount!)}</>
            ) : (
              <>You offered <strong>{formatPeso(offer.amount)}</strong></>
            )}
          </p>
          {left != null && (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-live-600">
              <Clock size={11} /> {left}h left to complete checkout
            </p>
          )}
        </div>
        <Badge variant={STATUS_VARIANT[offer.status] ?? "outline"}>{STATUS_LABEL[offer.status] ?? offer.status}</Badge>
      </div>

      {offer.status === "COUNTERED" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="brand" disabled={loading} onClick={() => respond("ACCEPT")}>Accept {formatPeso(offer.counterAmount!)}</Button>
          <Button size="sm" variant="ghost" disabled={loading} onClick={() => respond("DECLINE")}>Decline</Button>
        </div>
      )}

      {offer.status === "ACCEPTED" && (
        <div className="mt-3">
          <Button size="sm" variant="brand" asChild>
            <Link href="/cart">Complete checkout</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
