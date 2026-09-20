"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPeso } from "@/lib/utils";
import { respondToOfferAction } from "@/lib/actions/tawad";

interface OfferData {
  id: string;
  amount: number;
  counterAmount: number | null;
  status: string;
  expiresAt: string | null;
  reservedUntil: string | null;
  product: { id: string; title: string; image: string | undefined };
  buyerName: string;
}

function hoursLeft(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 3600000));
}

const STATUS_VARIANT: Record<string, "success" | "subtle" | "live" | "outline"> = {
  PENDING: "live",
  COUNTERED: "outline",
  ACCEPTED: "success",
};

export function TawadOfferRow({ offer }: { offer: OfferData }) {
  const router = useRouter();
  const [countering, setCountering] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function respond(action: "ACCEPT" | "DECLINE" | "COUNTER") {
    if (action === "COUNTER") {
      const value = Number(counterAmount);
      if (!value || value <= 0) return toast.error("Enter a valid counter amount.");
    }
    setLoading(true);
    const res = await respondToOfferAction(offer.id, action, action === "COUNTER" ? Number(counterAmount) : undefined);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success(action === "ACCEPT" ? "Offer accepted" : action === "DECLINE" ? "Offer declined" : "Counter sent");
    setCountering(false);
    router.refresh();
  }

  const left = offer.status === "ACCEPTED" ? hoursLeft(offer.reservedUntil) : hoursLeft(offer.expiresAt);

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
          <p className="text-xs text-ink-500">from {offer.buyerName}</p>
          <p className="mt-1 text-sm">
            {offer.status === "COUNTERED" ? (
              <>Offered <s className="text-ink-400">{formatPeso(offer.amount)}</s>, you countered {formatPeso(offer.counterAmount!)}</>
            ) : (
              <>Offered <strong>{formatPeso(offer.amount)}</strong></>
            )}
          </p>
          {left != null && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
              <Clock size={11} /> {offer.status === "ACCEPTED" ? `Buyer has ${left}h left to pay` : `${left}h left to respond`}
            </p>
          )}
        </div>
        <Badge variant={STATUS_VARIANT[offer.status] ?? "outline"}>{offer.status}</Badge>
      </div>

      {offer.status === "PENDING" && !countering && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="brand" disabled={loading} onClick={() => respond("ACCEPT")}>Accept</Button>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => setCountering(true)}>Counter</Button>
          <Button size="sm" variant="ghost" disabled={loading} onClick={() => respond("DECLINE")}>Decline</Button>
        </div>
      )}

      {offer.status === "PENDING" && countering && (
        <div className="mt-3 flex gap-2">
          <Input type="number" min={1} value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} placeholder="Counter amount (₱)" className="h-9" />
          <Button size="sm" variant="brand" disabled={loading} onClick={() => respond("COUNTER")}>Send</Button>
          <Button size="sm" variant="ghost" disabled={loading} onClick={() => setCountering(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
