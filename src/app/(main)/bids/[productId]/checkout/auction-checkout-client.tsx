"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPeso, cn } from "@/lib/utils";
import { completeAuctionPurchaseAction } from "@/lib/actions/auctions";
import { AVAILABLE_PAYMENT_METHODS, type PaymentMethodId } from "@/lib/payments/provider";

export function AuctionCheckoutClient({
  productId,
  item,
  defaultShipping,
}: {
  productId: string;
  item: { title: string; image: string; amount: number; seller: string };
  defaultShipping: { name: string; phone: string; address: string; city: string; province: string; postalCode: string };
}) {
  const router = useRouter();
  const [shipping, setShipping] = useState(defaultShipping);
  const [method, setMethod] = useState<PaymentMethodId>("GCASH");
  const [loading, setLoading] = useState(false);

  const shippingFee = 90;
  const total = item.amount + shippingFee;

  async function handlePlaceOrder() {
    if (!shipping.name || !shipping.phone || !shipping.address || !shipping.city || !shipping.province || !shipping.postalCode) {
      toast.error("Please complete your shipping details.");
      return;
    }
    setLoading(true);
    const res = await completeAuctionPurchaseAction(productId, shipping, method);
    setLoading(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("Order placed! 🎉", { action: { label: "View order", onClick: () => router.push("/orders") } });
    router.push("/");
  }

  return (
    <div className="grid grid-cols-1 gap-6 pb-28 md:grid-cols-[1fr_320px] md:pb-6">
      <div className="min-w-0 space-y-6">
        <section className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Shipping Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name" value={shipping.name} onChange={(v) => setShipping({ ...shipping, name: v })} full />
            <Field label="Phone number" value={shipping.phone} onChange={(v) => setShipping({ ...shipping, phone: v })} placeholder="+639171234567" full />
            <Field label="Street address" value={shipping.address} onChange={(v) => setShipping({ ...shipping, address: v })} full />
            <Field label="City / Municipality" value={shipping.city} onChange={(v) => setShipping({ ...shipping, city: v })} />
            <Field label="Province" value={shipping.province} onChange={(v) => setShipping({ ...shipping, province: v })} />
            <Field label="Postal code" value={shipping.postalCode} onChange={(v) => setShipping({ ...shipping, postalCode: v })} />
          </div>
        </section>

        <section className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Payment Method</h2>
          <div className="space-y-2">
            {AVAILABLE_PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
                  method === m.id ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:bg-ink-50"
                )}
              >
                <div>
                  <p className="text-sm font-bold text-ink-900">{m.label}</p>
                  <p className="text-xs text-ink-500">{m.description}</p>
                </div>
                {method === m.id && <CheckCircle2 size={20} className="text-brand-500" />}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Winning Bid</h2>
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
              <Image src={item.image} alt={item.title} fill className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{item.title}</p>
              <p className="text-xs text-ink-500">{item.seller}</p>
            </div>
            <span className="text-sm font-bold text-ink-900">{formatPeso(item.amount)}</span>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-ink-100 bg-white p-4 md:static md:z-auto md:h-fit md:rounded-card md:border">
        <div className="mb-1 flex justify-between text-sm text-ink-500">
          <span>Winning bid</span>
          <span>{formatPeso(item.amount)}</span>
        </div>
        <div className="mb-3 flex justify-between text-sm text-ink-500">
          <span>Shipping fee</span>
          <span>{formatPeso(shippingFee)}</span>
        </div>
        <div className="mb-4 flex justify-between border-t border-ink-100 pt-3 text-base font-extrabold text-ink-900">
          <span>Total</span>
          <span>{formatPeso(total)}</span>
        </div>
        <Button variant="brand" size="lg" className="w-full" onClick={handlePlaceOrder} disabled={loading}>
          {loading ? "Placing order..." : `Pay · ${formatPeso(total)}`}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, full,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; full?: boolean }) {
  return (
    <div className={cn("space-y-1.5", full && "col-span-2")}>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
