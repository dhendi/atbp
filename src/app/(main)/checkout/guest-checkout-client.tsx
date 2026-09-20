"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPeso } from "@/lib/utils";
import { guestCheckoutAction } from "@/lib/actions/guest-checkout";
import { AVAILABLE_PAYMENT_METHODS, type PaymentMethodId } from "@/lib/payments/provider";
import { buyerProtectionFeeFor, BUYER_PROTECTION_DEFAULT_ON } from "@/lib/fees";
import type { ShippingOption } from "@/lib/shipping/registry";
import { GuestOrderSuccess } from "./guest-order-success";

interface GuestProduct {
  id: string;
  title: string;
  image: string;
  unitPrice: number;
  seller: string;
  isDigital: boolean;
}

// Guest checkout never offers COD — see GUEST_BLOCKED_PAYMENT_METHODS in
// lib/services/guest-checkout.ts, enforced again here so the option never
// even renders, and once more server-side (defense in depth).
const GUEST_PAYMENT_METHODS = AVAILABLE_PAYMENT_METHODS.filter((m) => m.id !== "COD");

export function GuestCheckoutClient({
  product, quantity, shippingOptions,
}: { product: GuestProduct; quantity: number; shippingOptions: ShippingOption[] }) {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("GCASH");
  const [shippingProviderId, setShippingProviderId] = useState(shippingOptions[0]?.providerId ?? "");
  const [buyerProtectionOptIn, setBuyerProtectionOptIn] = useState(BUYER_PROTECTION_DEFAULT_ON);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ orderNumber: string; trackingUrl: string } | null>(null);

  const subtotal = product.unitPrice * quantity;
  const selectedShippingOption = shippingOptions.find((o) => o.providerId === shippingProviderId);
  const shippingFee = product.isDigital ? 0 : selectedShippingOption?.fee ?? 0;
  const buyerProtectionFee = buyerProtectionFeeFor(subtotal, paymentMethod, buyerProtectionOptIn);
  const total = subtotal + shippingFee + buyerProtectionFee;

  async function submit() {
    if (!email.trim() || !phone.trim() || !name.trim()) return toast.error("Fill in your contact details.");
    if (!product.isDigital && (!address.trim() || !city.trim() || !province.trim() || !postalCode.trim())) {
      return toast.error("Fill in your delivery address.");
    }
    setLoading(true);
    // guestCheckoutAction is expected to always resolve with { error } rather
    // than throw, but an unexpected failure upstream shouldn't leave the
    // button stuck on "Placing order..." forever with no feedback — this
    // guarantees the user always sees a clean message either way.
    try {
      const res = await guestCheckoutAction({
        productId: product.id,
        quantity,
        email,
        phone,
        shipping: {
          name, phone,
          address: product.isDigital ? "Digital delivery, no shipping address" : address,
          city: product.isDigital ? "N/A" : city,
          province: product.isDigital ? "N/A" : province,
          postalCode: product.isDigital ? "N/A" : postalCode,
        },
        paymentMethod,
        shippingProviderId: !product.isDigital ? shippingProviderId : undefined,
        buyerProtectionOptIn,
      });
      if ("error" in res) return toast.error(res.error);
      setResult({ orderNumber: res.orderNumber, trackingUrl: res.trackingUrl });
    } catch {
      toast.error("Something went wrong placing your order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return <GuestOrderSuccess orderNumber={result.orderNumber} trackingUrl={result.trackingUrl} email={email} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-3.5 text-sm">
          <span className="font-semibold text-ink-700">Have an account?</span>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/login?callbackUrl=${encodeURIComponent(pathname ?? "/checkout")}`}><LogIn size={14} /> Log in</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/signup?callbackUrl=${encodeURIComponent(pathname ?? "/checkout")}`}><UserPlus size={14} /> Create account</Link>
          </Button>
          <span className="text-ink-400">Or just continue below as a guest.</span>
        </div>

        <div className="space-y-3">
          <h2 className="font-bold text-ink-900">Contact details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="guest-email">Email</Label>
              <Input id="guest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-phone">Phone number</Label>
              <Input id="guest-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+639171234567" required />
            </div>
          </div>
          <p className="text-xs text-ink-400">We&apos;ll email your receipt and a link to track this order. No account needed.</p>
        </div>

        <div className="space-y-3">
          <h2 className="font-bold text-ink-900">{product.isDigital ? "Recipient" : "Delivery details"}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="guest-name">Full name</Label>
            <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {!product.isDigital && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="guest-address">Street address</Label>
                <Input id="guest-address" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-city">City / Municipality</Label>
                  <Input id="guest-city" value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guest-province">Province</Label>
                  <Input id="guest-province" value={province} onChange={(e) => setProvince(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guest-postal">Postal code</Label>
                  <Input id="guest-postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
                </div>
              </div>
            </>
          )}
        </div>

        {!product.isDigital && shippingOptions.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-bold text-ink-900">Shipping Method</h2>
            <div className="space-y-2">
              {shippingOptions.map((o) => (
                <label
                  key={o.providerId}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3 ${shippingProviderId === o.providerId ? "border-brand-500 bg-brand-50" : "border-ink-200"}`}
                >
                  <span className="flex items-center gap-3">
                    <input type="radio" name="guest-shipping" checked={shippingProviderId === o.providerId} onChange={() => setShippingProviderId(o.providerId)} className="accent-brand-500" />
                    <span>
                      <span className="block text-sm font-semibold text-ink-900">{o.label}</span>
                      {o.etaDays && <span className="block text-xs text-ink-500">Arrives in ~{o.etaDays} day{o.etaDays !== 1 ? "s" : ""}</span>}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-ink-900">{o.fee > 0 ? formatPeso(o.fee) : "Free"}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="font-bold text-ink-900">Payment Method</h2>
          <p className="text-xs text-ink-400">Guest checkout is prepaid only. Cash on Delivery requires an account.</p>
          <div className="space-y-2">
            {GUEST_PAYMENT_METHODS.map((m) => (
              <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${paymentMethod === m.id ? "border-brand-500 bg-brand-50" : "border-ink-200"}`}>
                <input type="radio" name="guest-payment" checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} className="mt-1 accent-brand-500" />
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{m.label}</span>
                  <span className="block text-xs text-ink-500">{m.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-ink-100 p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={buyerProtectionOptIn}
              onChange={(e) => setBuyerProtectionOptIn(e.target.checked)}
              className="mt-1 h-4 w-4 accent-brand-500"
            />
            <span className="flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                  <ShieldCheck size={15} className="text-brand-500" /> Add Buyer Protection
                </span>
                <span className="shrink-0 text-sm font-bold text-ink-900">
                  {formatPeso(buyerProtectionFeeFor(subtotal, paymentMethod, true))}
                </span>
              </span>
              <span className="mt-1 block text-xs text-ink-500">
                Refund guarantee if your order never arrives or isn&apos;t as described.
              </span>
            </span>
          </label>
          {!buyerProtectionOptIn && (
            <p className="rounded-xl bg-ink-50 p-2.5 text-xs text-ink-500">
              Without Buyer Protection, you can still report a problem, but refunds aren&apos;t guaranteed by ATBP.
            </p>
          )}
        </div>
      </div>

      <div className="h-fit space-y-3 rounded-2xl border border-ink-100 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink-100">
            <Image src={product.image} alt={product.title} fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{product.title}</p>
            <p className="text-xs text-ink-500">{product.seller} · Qty {quantity}</p>
          </div>
        </div>
        <div className="space-y-1 border-t border-ink-100 pt-3 text-sm">
          <div className="flex justify-between text-ink-600"><span>Subtotal</span><span>{formatPeso(subtotal)}</span></div>
          <div className="flex justify-between text-ink-600"><span>Shipping fee</span><span>{formatPeso(shippingFee)}</span></div>
          {buyerProtectionFee > 0 && <div className="flex justify-between text-ink-600"><span>Buyer Protection</span><span>{formatPeso(buyerProtectionFee)}</span></div>}
          <div className="flex justify-between border-t border-ink-100 pt-1.5 text-base font-extrabold text-ink-900"><span>Total</span><span>{formatPeso(total)}</span></div>
        </div>
        <Button variant="brand" size="lg" className="w-full" onClick={submit} disabled={loading}>
          {loading ? "Placing order..." : `Place Order · ${formatPeso(total)}`}
        </Button>
        {buyerProtectionFee > 0 && (
          <p className="flex items-start gap-1 text-xs text-ink-400">
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-brand-500" />
            Buyer Protection covers this order for a refund if it never arrives or isn&apos;t as described.
          </p>
        )}
        <p className="text-center text-[11px] text-ink-400">
          By placing this order, you agree to ATBP&apos;s{" "}
          <Link href="/terms" className="font-semibold text-ink-600 hover:underline">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="font-semibold text-ink-600 hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
