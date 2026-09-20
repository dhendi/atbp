"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPeso } from "@/lib/utils";
import { orderServiceAction } from "@/lib/actions/services";
import { AVAILABLE_PAYMENT_METHODS, type PaymentMethodId } from "@/lib/payments/provider";

interface ServicePackage {
  id: string;
  tier: string;
  price: number;
  deliverables: string;
  deliveryDays: number;
  revisionsIncluded: number;
}

const SERVICE_PAYMENT_METHODS = AVAILABLE_PAYMENT_METHODS.filter((m) => m.id !== "COD");

export function ServicePackagePicker({ packages, loggedIn, isSeller }: { packages: ServicePackage[]; loggedIn: boolean; isSeller: boolean }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(packages[0]?.id ?? "");
  const [step, setStep] = useState<"pick" | "checkout">("pick");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethodId>("GCASH");
  const [loading, setLoading] = useState(false);

  const selected = packages.find((p) => p.id === selectedId);
  if (packages.length === 0) return null;

  async function handleOrder() {
    if (!loggedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!name.trim() || !phone.trim()) return toast.error("Enter your name and phone number.");
    setLoading(true);
    const res = await orderServiceAction(selectedId, { name, phone }, method);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Order placed! Submit your requirements to get started.");
    router.push(`/orders/${res.orderId}`);
  }

  return (
    <div className="mt-4 space-y-3">
      {step === "pick" ? (
        <>
          <div className="space-y-2">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedId(pkg.id)}
                className={`w-full rounded-2xl border p-3.5 text-left transition-colors ${selectedId === pkg.id ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:bg-ink-50"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink-900">{pkg.tier}</span>
                  <span className="text-lg font-bold text-ink-900">{formatPeso(pkg.price)}</span>
                </div>
                <p className="mt-1 text-xs text-ink-600">{pkg.deliverables}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {pkg.deliveryDays}-day delivery · {pkg.revisionsIncluded} revision{pkg.revisionsIncluded !== 1 ? "s" : ""} included
                </p>
              </button>
            ))}
          </div>
          {isSeller ? (
            <p className="text-center text-xs text-ink-400">This is your own listing.</p>
          ) : (
            <Button variant="brand" size="lg" className="w-full" onClick={() => setStep("checkout")} disabled={!selected}>
              <Handshake size={16} /> Order {selected?.tier} Package · {selected ? formatPeso(selected.price) : ""}
            </Button>
          )}
        </>
      ) : (
        <div className="space-y-3 rounded-2xl border border-ink-100 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink-900">{selected?.tier} Package</p>
            <p className="text-sm font-bold text-ink-900">{selected ? formatPeso(selected.price) : ""}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="svc-name">Full name</Label>
            <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Santos" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="svc-phone">Phone number</Label>
            <Input id="svc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+639171234567" />
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <div className="space-y-1.5">
              {SERVICE_PAYMENT_METHODS.map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${method === m.id ? "border-brand-500 bg-brand-50" : "border-ink-200"}`}>
                  <input type="radio" name="svc-payment" checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-brand-500" />
                  <span className="text-sm font-semibold text-ink-800">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-ink-500">
            <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-brand-500" />
            Payment is held by ATBP until you accept the delivery. Services are prepaid only, no Cash on Delivery.
          </p>
          <div className="flex gap-2">
            <Button variant="brand" className="flex-1" onClick={handleOrder} disabled={loading}>
              {loading ? "Placing order..." : `Pay ${selected ? formatPeso(selected.price) : ""}`}
            </Button>
            <Button variant="ghost" onClick={() => setStep("pick")}>Back</Button>
          </div>
        </div>
      )}
    </div>
  );
}
