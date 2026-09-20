"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPeso } from "@/lib/utils";
import { orderDigitalProductAction } from "@/lib/actions/digital-products";
import { AVAILABLE_PAYMENT_METHODS, type PaymentMethodId } from "@/lib/payments/provider";

const DIGITAL_PAYMENT_METHODS = AVAILABLE_PAYMENT_METHODS.filter((m) => m.id !== "COD");

export function DigitalProductBuyButton({ productId, price, loggedIn, isSeller }: { productId: string; price: number; loggedIn: boolean; isSeller: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "checkout">("idle");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethodId>("GCASH");
  const [loading, setLoading] = useState(false);

  if (isSeller) return <p className="mt-4 text-center text-xs text-ink-400">This is your own listing.</p>;

  async function handleBuy() {
    if (!loggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!name.trim() || !phone.trim()) return toast.error("Enter your name and phone number.");
    setLoading(true);
    const res = await orderDigitalProductAction(productId, { name, phone }, method);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Purchase complete. Your download is ready!");
    router.push(`/orders/${res.orderId}`);
  }

  if (step === "idle") {
    return (
      <Button variant="brand" size="lg" className="mt-4 w-full" onClick={() => (loggedIn ? setStep("checkout") : router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`))}>
        <Download size={16} /> Buy Now · {formatPeso(price)}
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-ink-100 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink-900">Instant download</p>
        <p className="text-sm font-bold text-ink-900">{formatPeso(price)}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dp-name">Full name</Label>
        <Input id="dp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Santos" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dp-phone">Phone number</Label>
        <Input id="dp-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+639171234567" />
      </div>
      <div className="space-y-1.5">
        <Label>Payment method</Label>
        <div className="space-y-1.5">
          {DIGITAL_PAYMENT_METHODS.map((m) => (
            <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${method === m.id ? "border-brand-500 bg-brand-50" : "border-ink-200"}`}>
              <input type="radio" name="dp-payment" checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-brand-500" />
              <span className="text-sm font-semibold text-ink-800">{m.label}</span>
            </label>
          ))}
        </div>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-ink-500">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-brand-500" />
        Non-refundable once downloaded, except for not-as-described, corrupt/undeliverable files, or fraud. Prepaid only, no Cash on Delivery.
      </p>
      <div className="flex gap-2">
        <Button variant="brand" className="flex-1" onClick={handleBuy} disabled={loading}>
          {loading ? "Processing..." : `Pay ${formatPeso(price)}`}
        </Button>
        <Button variant="ghost" onClick={() => setStep("idle")}>Back</Button>
      </div>
    </div>
  );
}
