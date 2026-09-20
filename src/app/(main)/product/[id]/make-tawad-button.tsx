"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { formatPeso } from "@/lib/utils";
import { submitOfferAction, respondToCounterAction } from "@/lib/actions/tawad";

interface MyOffer {
  id: string;
  amount: number;
  counterAmount: number | null;
  status: string;
}

export function MakeTawadButton({
  productId, listedPrice, maxOffers, loggedIn, myOffers,
}: { productId: string; listedPrice: number; maxOffers: number; loggedIn: boolean; myOffers: MyOffer[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const openOffer = myOffers.find((o) => o.status === "PENDING" || o.status === "COUNTERED");
  const offerCount = myOffers.length;

  async function submit() {
    if (!loggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname ?? "/")}`);
      return;
    }
    const value = Number(amount);
    if (!value || value <= 0) return toast.error("Enter a valid offer amount.");
    setLoading(true);
    const res = await submitOfferAction(productId, value);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    if (res.outcome === "AUTO_DECLINED") toast.error("Offer declined.");
    else if (res.outcome === "AUTO_ACCEPTED") toast.success("Tawad accepted! Check My Offers to complete checkout.");
    else toast.success("Offer sent. The seller will respond soon.");
    setOpen(false);
    setAmount("");
    router.refresh();
  }

  async function respondCounter(action: "ACCEPT" | "DECLINE") {
    if (!openOffer) return;
    setLoading(true);
    const res = await respondToCounterAction(openOffer.id, action);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success(action === "ACCEPT" ? "Counter accepted! Check My Offers to complete checkout." : "Counter declined.");
    router.refresh();
  }

  if (openOffer?.status === "PENDING") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gold-200 bg-gold-50 px-3.5 py-2.5 text-sm text-gold-800">
        <Handshake size={15} className="shrink-0" />
        Your Tawad of {formatPeso(openOffer.amount)} is with the seller.
      </div>
    );
  }

  if (openOffer?.status === "COUNTERED" && openOffer.counterAmount != null) {
    return (
      <div className="space-y-2 rounded-2xl border border-gold-200 bg-gold-50 p-3.5">
        <p className="text-sm text-gold-800">
          Seller countered your {formatPeso(openOffer.amount)} with <strong>{formatPeso(openOffer.counterAmount)}</strong>.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="brand" disabled={loading} onClick={() => respondCounter("ACCEPT")}>Accept</Button>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => respondCounter("DECLINE")}>Decline</Button>
        </div>
      </div>
    );
  }

  if (offerCount >= maxOffers) {
    return <p className="text-xs text-ink-400">You&apos;ve used all {maxOffers} of your Tawad offers on this item.</p>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Handshake size={15} /> Tawad (offer)
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a Tawad</DialogTitle>
          <DialogDescription>
            Listed at {formatPeso(listedPrice)}. Offer what you think is fair. The seller can accept, decline, or counter.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="tawad-amount">Your offer (₱)</Label>
          <Input id="tawad-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 450" autoFocus />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="brand" disabled={loading} onClick={submit}>
            {loading ? "Sending..." : "Send Tawad"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
