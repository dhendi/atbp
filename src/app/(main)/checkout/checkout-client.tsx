"use client";

import { track } from "@/lib/analytics-client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Truck, Store, Bike, X, ArrowRight, ArrowLeft, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPeso, cn } from "@/lib/utils";
import { checkoutAction } from "@/lib/actions/orders";
import { removeCartItemAction } from "@/lib/actions/cart";
import { validatePromoCodeAction } from "@/lib/actions/promo";
import { AVAILABLE_PAYMENT_METHODS, type PaymentMethodId } from "@/lib/payments/provider";
import { buyerProtectionFeeFor, BUYER_PROTECTION_DEFAULT_ON } from "@/lib/fees";
import type { ShippingOption } from "@/lib/shipping/registry";
import { ProductCard, type ProductCardData } from "@/components/domain/product-card";

type FulfillmentMethod = "SHIP" | "PICKUP" | "LOCAL_DELIVERY";

interface Item {
  id: string;
  title: string;
  image: string;
  unitPrice: number;
  quantity: number;
  seller: string;
  sellerId: string;
  personalizationNote?: string | null;
}

interface PickupSeller {
  shopName: string;
  area: string | null;
  pickupInstructions: string | null;
}

interface Recommendations {
  moreFromSellers: ProductCardData[];
  youMightLike: ProductCardData[];
  basedOnSearches: ProductCardData[];
}

export function CheckoutClient({
  items,
  defaultShipping,
  shipEligible,
  pickupEligible,
  pickupSellers,
  pickupLabel,
  localDeliveryEligible,
  localDeliveryFee,
  allDigital,
  codEligible,
  shippingOptions,
  welcomeCoupon,
  recommendations,
}: {
  items: Item[];
  defaultShipping: { name: string; phone: string; address: string; city: string; province: string; postalCode: string };
  shipEligible: boolean;
  pickupEligible: boolean;
  pickupSellers: PickupSeller[];
  /** "Store Pickup" for a BIR-verified Shop, "Local Pickup" for a casual
   * Closet/Yard Sale seller — see the comment in checkout/page.tsx. */
  pickupLabel: string;
  localDeliveryEligible: boolean;
  localDeliveryFee: number;
  allDigital: boolean;
  /** Whether an active shipping provider can actually collect/remit COD right
   * now (manual tracking can't) — see codCapableProviderActive(). */
  codEligible: boolean;
  /** Courier options for "Ship to me", from the shipping layer's provider
   * registry — always at least one (manual/flat-fee) once shipping is
   * eligible at all. See getShippingOptionsFor. */
  shippingOptions: ShippingOption[];
  welcomeCoupon: { code: string; discountAmount: number } | null;
  recommendations: Recommendations;
}) {
  const router = useRouter();
  const [checkoutItems, setCheckoutItems] = useState(items);
  const [shipping, setShipping] = useState(defaultShipping);
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod | null>(
    allDigital
      ? null
      : shipEligible
        ? "SHIP"
        : pickupEligible
          ? "PICKUP"
          : localDeliveryEligible
            ? "LOCAL_DELIVERY"
            : null
  );
  const [shippingProviderId, setShippingProviderId] = useState(shippingOptions[0]?.providerId ?? "");
  const [buyerProtectionOptIn, setBuyerProtectionOptIn] = useState(BUYER_PROTECTION_DEFAULT_ON);
  const [method, setMethod] = useState<PaymentMethodId>("GCASH");
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function handlePromoCodeChange(v: string) {
    setPromoCode(v.toUpperCase());
    setPromoStatus("idle");
  }

  async function handleCheckPromoCode() {
    if (!promoCode.trim()) return;
    setPromoStatus("checking");
    const res = await validatePromoCodeAction(checkoutItems.map((i) => i.id), promoCode.trim());
    setPromoMessage(res.message);
    if (res.valid) {
      setPromoStatus("valid");
      setPromoDiscount(res.discountAmount);
    } else {
      setPromoStatus("invalid");
      setPromoDiscount(0);
    }
  }

  async function handleRemoveItem(id: string) {
    setRemovingId(id);
    await removeCartItemAction(id);
    setRemovingId(null);
    const remaining = checkoutItems.filter((i) => i.id !== id);
    if (remaining.length === 0) {
      toast.success("Item removed");
      router.push("/cart");
      return;
    }
    setCheckoutItems(remaining);
    toast.success("Item removed from this order");
  }

  const showFulfillmentPicker = !allDigital && (shipEligible || pickupEligible || localDeliveryEligible);
  const canFulfill = allDigital || !!fulfillment;
  const needsAddress = !allDigital && fulfillment === "SHIP";
  const subtotal = checkoutItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const selectedShippingOption = shippingOptions.find((o) => o.providerId === shippingProviderId);
  const shippingFee = allDigital
    ? 0
    : fulfillment === "SHIP"
      ? selectedShippingOption?.fee ?? 0
      : fulfillment === "LOCAL_DELIVERY"
        ? localDeliveryFee
        : 0;
  const appliedDiscount = promoStatus === "valid" ? Math.min(promoDiscount, subtotal) : 0;
  const welcomeCouponDiscount = welcomeCoupon ? Math.min(welcomeCoupon.discountAmount, Math.max(0, subtotal - appliedDiscount)) : 0;
  // Checkout can span multiple sellers — the server creates one Order per
  // seller and caps the protection fee per order, so the accurate preview
  // sums the fee per seller group rather than applying the cap once to the
  // combined cart subtotal.
  const sellerSubtotals = Object.values(
    checkoutItems.reduce<Record<string, number>>((bySeller, i) => {
      bySeller[i.sellerId] = (bySeller[i.sellerId] ?? 0) + i.unitPrice * i.quantity;
      return bySeller;
    }, {})
  );
  const buyerProtectionFee = sellerSubtotals.reduce((sum, sellerSubtotal) => sum + buyerProtectionFeeFor(sellerSubtotal, method, buyerProtectionOptIn), 0);
  // What the toggle above would cost if turned on — shown next to the
  // checkbox regardless of its current state, so unchecking it doesn't hide
  // the price you'd be giving up.
  const buyerProtectionFeeIfOptedIn = sellerSubtotals.reduce((sum, sellerSubtotal) => sum + buyerProtectionFeeFor(sellerSubtotal, method, true), 0);
  const total = subtotal + shippingFee + buyerProtectionFee - appliedDiscount - welcomeCouponDiscount;

  const feeLabel = allDigital
    ? "Delivery"
    : fulfillment === "SHIP"
      ? "Shipping fee"
      : fulfillment === "LOCAL_DELIVERY"
        ? "Local delivery"
        : fulfillment === "PICKUP"
          ? pickupLabel
          : "Fulfillment";

  async function handlePlaceOrder() {
    if (!canFulfill) {
      toast.error("None of the items in this order can be fulfilled together. Remove an item or check with the seller.");
      return;
    }
    if (!shipping.name || !shipping.phone) {
      toast.error("Please add your name and phone number.");
      return;
    }
    if (needsAddress && (!shipping.address || !shipping.city || !shipping.province || !shipping.postalCode)) {
      toast.error("Please complete your shipping details.");
      return;
    }
    const finalShipping = needsAddress
      ? shipping
      : { ...shipping, address: "Local pickup", city: shipping.city || "N/A", province: shipping.province || "N/A", postalCode: shipping.postalCode || "N/A" };
    setLoading(true);
    // checkoutAction is expected to always resolve with { error } rather than
    // throw, but an unexpected failure upstream (e.g. a DB hiccup) shouldn't
    // leave the button stuck on "Placing order..." forever with no feedback —
    // this guarantees the user always sees a clean message either way.
    try {
      const res = await checkoutAction(
        checkoutItems.map((i) => i.id),
        finalShipping,
        method,
        promoCode.trim() || undefined,
        fulfillment ?? undefined,
        fulfillment === "SHIP" ? shippingProviderId : undefined,
        buyerProtectionOptIn
      );
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      track("order_placed", { payment_method: method, item_count: checkoutItems.length, fulfillment: fulfillment ?? "none" });
      toast.success("Order placed! 🎉", { action: { label: "View order", onClick: () => router.push("/orders") } });
      router.push("/");
    } catch {
      toast.error("Something went wrong placing your order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 pb-6 md:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        {!allDigital && !canFulfill && (
          <section className="rounded-card border border-live-300 bg-live-50 p-4">
            <h2 className="font-bold text-live-700">These items can&apos;t be fulfilled together</h2>
            <p className="mt-1 text-sm text-live-700">
              At least one item here doesn&apos;t ship, and pickup or local delivery isn&apos;t available for it either. Remove it from this order or check with the seller.
            </p>
          </section>
        )}

        {showFulfillmentPicker && (
          <section className="rounded-card border border-ink-100 bg-white p-4">
            <h2 className="mb-3 font-bold text-ink-900">How do you want to get this?</h2>

            {(shipEligible || pickupEligible) && (
              <div className="space-y-2">
                <Label>Shipping method</Label>
                {shippingOptions.map((o) => (
                  <label
                    key={o.providerId}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5",
                      fulfillment === "SHIP" && shippingProviderId === o.providerId ? "border-brand-500 bg-brand-50" : "border-ink-200"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="shipping-method"
                        checked={fulfillment === "SHIP" && shippingProviderId === o.providerId}
                        onChange={() => {
                          setFulfillment("SHIP");
                          setShippingProviderId(o.providerId);
                        }}
                        className="accent-brand-500"
                      />
                      <span className="flex items-center gap-1.5">
                        <Truck size={14} className="text-brand-600" />
                        <span>
                          <span className="block text-sm font-semibold text-ink-900">{o.label}</span>
                          {o.etaDays && <span className="block text-xs text-ink-500">Arrives in ~{o.etaDays} day{o.etaDays !== 1 ? "s" : ""}</span>}
                        </span>
                      </span>
                    </span>
                    <span className="text-sm font-bold text-ink-900">{o.fee > 0 ? formatPeso(o.fee) : "Free"}</span>
                  </label>
                ))}
                {pickupEligible && (
                  <label
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5",
                      fulfillment === "PICKUP" ? "border-brand-500 bg-brand-50" : "border-ink-200"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="shipping-method"
                        checked={fulfillment === "PICKUP"}
                        onChange={() => {
                          setFulfillment("PICKUP");
                          // Pickup is prepaid only — see the payment-method
                          // filter below, which hides COD once this is picked.
                          if (method === "COD") setMethod("GCASH");
                        }}
                        className="accent-brand-500"
                      />
                      <span className="flex items-center gap-1.5">
                        <Store size={14} className="text-brand-600" />
                        <span>
                          <span className="block text-sm font-semibold text-ink-900">{pickupLabel}</span>
                          <span className="block text-xs text-ink-500">Arrange with the seller</span>
                        </span>
                      </span>
                    </span>
                    <span className="text-sm font-bold text-ink-900">Free</span>
                  </label>
                )}
              </div>
            )}

            {localDeliveryEligible && (
              <div className={cn("grid grid-cols-2 gap-2", (shipEligible || pickupEligible) && "mt-3 border-t border-ink-100 pt-3")}>
                <FulfillmentOption
                  icon={Bike}
                  title="Local delivery"
                  subtitle={localDeliveryFee > 0 ? `${formatPeso(localDeliveryFee)}, delivered by the seller` : "Free, delivered by the seller"}
                  active={fulfillment === "LOCAL_DELIVERY"}
                  onClick={() => setFulfillment("LOCAL_DELIVERY")}
                />
              </div>
            )}

            {fulfillment === "PICKUP" && (
              <div className="mt-3 space-y-2 border-t border-ink-100 pt-3">
                {pickupSellers.map((s) => (
                  <div key={s.shopName} className="text-sm">
                    <p className="font-semibold text-ink-800">{s.shopName}{s.area ? ` · ${s.area}` : ""}</p>
                    <p className="text-xs text-ink-500">
                      {s.pickupInstructions ?? "Exact pickup arrangements will be shared once your order is confirmed."}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {fulfillment === "LOCAL_DELIVERY" && (
              <p className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
                The seller delivers this to your area directly. Add your address below so they know where to bring it.
              </p>
            )}
          </section>
        )}

        <section className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">{needsAddress ? "Shipping Information" : "Contact Information"}</h2>
          {allDigital && (
            <p className="mb-3 text-xs text-ink-500">This order is digital, so there&apos;s nothing to ship. We&apos;ll just need your name and number for your receipt.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name" value={shipping.name} onChange={(v) => setShipping({ ...shipping, name: v })} full />
            <Field label="Phone number" value={shipping.phone} onChange={(v) => setShipping({ ...shipping, phone: v })} placeholder="+639171234567" full />
            {(needsAddress || fulfillment === "LOCAL_DELIVERY") && (
              <>
                <Field label="Street address" value={shipping.address} onChange={(v) => setShipping({ ...shipping, address: v })} full />
                <Field label="City / Municipality" value={shipping.city} onChange={(v) => setShipping({ ...shipping, city: v })} />
                <Field label="Province" value={shipping.province} onChange={(v) => setShipping({ ...shipping, province: v })} />
                <Field label="Postal code" value={shipping.postalCode} onChange={(v) => setShipping({ ...shipping, postalCode: v })} />
              </>
            )}
          </div>
        </section>

        <section className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Payment Method</h2>
          <div className="space-y-2">
            {AVAILABLE_PAYMENT_METHODS.filter((m) => m.id !== "COD" || (codEligible && fulfillment !== "PICKUP")).map((m) => (
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
          <p className="mt-3 text-[11px] text-ink-400">
            This is a demo checkout: payments are simulated so you can test the full order flow end-to-end.
          </p>
        </section>

        {method !== "COD" && (
          <section className="rounded-card border border-ink-100 bg-white p-4">
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
                  <span className="shrink-0 text-sm font-bold text-ink-900">{formatPeso(buyerProtectionFeeIfOptedIn)}</span>
                </span>
                <span className="mt-1 block text-xs text-ink-500">
                  Refund guarantee if your order never arrives or isn&apos;t as described.
                </span>
              </span>
            </label>
            {!buyerProtectionOptIn && (
              <p className="mt-2 rounded-xl bg-ink-50 p-2.5 text-xs text-ink-500">
                Without Buyer Protection, you can still report a problem, but refunds aren&apos;t guaranteed by ATBP.
              </p>
            )}
          </section>
        )}

        <section className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Promo Code</h2>
          <div className="flex gap-2">
            <Input
              value={promoCode}
              onChange={(e) => handlePromoCodeChange(e.target.value)}
              placeholder="Enter a seller's promo code"
              className="uppercase"
            />
            <Button type="button" variant="outline" onClick={handleCheckPromoCode} disabled={!promoCode.trim() || promoStatus === "checking"}>
              {promoStatus === "checking" ? <Loader2 size={15} className="animate-spin" /> : "Check"}
            </Button>
          </div>
          {promoStatus === "valid" && (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-live-600">
              <CheckCircle2 size={13} /> Valid! You&apos;ll save {formatPeso(promoDiscount)}
            </p>
          )}
          {promoStatus === "invalid" && (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-600">
              <XCircle size={13} /> {promoMessage}
            </p>
          )}
          {promoStatus === "idle" && (
            <p className="mt-2 text-xs text-ink-500">Applies to items from the matching seller only.</p>
          )}
        </section>
      </div>

      <div className="rounded-card border border-ink-100 bg-white p-4 md:h-fit">
        <h2 className="mb-3 font-bold text-ink-900">Order Summary</h2>
        <div className="space-y-3">
          {checkoutItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                <Image src={item.image} alt={item.title} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{item.title}</p>
                <p className="text-xs text-ink-500">{item.seller} · Qty {item.quantity}</p>
                {item.personalizationNote && (
                  <p className="mt-0.5 truncate text-xs italic text-ink-500">&quot;{item.personalizationNote}&quot;</p>
                )}
              </div>
              <span className="text-sm font-bold text-ink-900">{formatPeso(item.unitPrice * item.quantity)}</span>
              <button
                type="button"
                onClick={() => handleRemoveItem(item.id)}
                disabled={removingId === item.id}
                aria-label={`Remove ${item.title}`}
                className="shrink-0 rounded-full p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 disabled:opacity-50"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-ink-100 pt-4">
          <div className="mb-1 flex justify-between text-sm text-ink-500">
            <span>Subtotal</span>
            <span>{formatPeso(subtotal)}</span>
          </div>
          <div className="mb-1 flex justify-between text-sm text-ink-500">
            <span>{feeLabel}</span>
            <span>{shippingFee > 0 ? formatPeso(shippingFee) : "Free"}</span>
          </div>
          {buyerProtectionFee > 0 && (
            <div className="mb-1 flex justify-between text-sm text-ink-500">
              <span className="flex items-center gap-1">
                <ShieldCheck size={13} className="text-brand-500" /> Buyer Protection
              </span>
              <span>{formatPeso(buyerProtectionFee)}</span>
            </div>
          )}
          {appliedDiscount > 0 && (
            <div className="mb-3 flex justify-between text-sm text-live-600">
              <span>Promo discount</span>
              <span>-{formatPeso(appliedDiscount)}</span>
            </div>
          )}
          {welcomeCouponDiscount > 0 && (
            <div className="mb-3 flex items-center justify-between text-sm font-semibold text-brand-600">
              <span>🎉 Welcome coupon ({welcomeCoupon!.code})</span>
              <span>-{formatPeso(welcomeCouponDiscount)}</span>
            </div>
          )}
          <div className="mb-4 flex justify-between border-t border-ink-100 pt-3 text-base font-extrabold text-ink-900">
            <span>Total</span>
            <span>{formatPeso(total)}</span>
          </div>
          <Button variant="brand" size="lg" className="w-full" onClick={handlePlaceOrder} disabled={loading || !canFulfill}>
            {loading ? "Placing order..." : `Place Order · ${formatPeso(total)}`}
          </Button>
          {buyerProtectionFee > 0 && (
            <p className="mt-2 flex items-start gap-1 text-xs text-ink-400">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-brand-500" />
              Buyer Protection covers this order for a refund if it never arrives or isn&apos;t as described.
            </p>
          )}
          <p className="mt-2 text-center text-[11px] text-ink-400">
            By placing this order, you agree to ATBP&apos;s{" "}
            <Link href="/terms" className="font-semibold text-ink-600 hover:underline">Terms of Service</Link> and{" "}
            <Link href="/privacy" className="font-semibold text-ink-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        {(recommendations.moreFromSellers.length > 0 || recommendations.youMightLike.length > 0 || recommendations.basedOnSearches.length > 0) && (
          <div className="space-y-6">
            {recommendations.youMightLike.length > 0 && (
              <ProductShelf title="You might like" products={recommendations.youMightLike} />
            )}
            {recommendations.basedOnSearches.length > 0 && (
              <ProductShelf title="Based on your searches" products={recommendations.basedOnSearches} />
            )}
            {recommendations.moreFromSellers.length > 0 && (
              <ProductShelf title="More from this seller" products={recommendations.moreFromSellers} />
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 pb-2 pt-2 text-sm">
          <Link href="/cart" className="flex items-center gap-1 font-semibold text-ink-500 hover:text-ink-800">
            <ArrowLeft size={14} /> Back to cart
          </Link>
          <span className="text-ink-200">·</span>
          <Link href="/" className="flex items-center gap-1 font-semibold text-ink-500 hover:text-ink-800">
            Continue shopping <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProductShelf({ title, products }: { title: string; products: ProductCardData[] }) {
  return (
    <section>
      <h2 className="mb-3 font-bold text-ink-900">{title}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {products.map((p) => (
          <div key={p.id} className="w-[150px] shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

function FulfillmentOption({
  icon: Icon, title, subtitle, active, onClick,
}: { icon: typeof Truck; title: string; subtitle: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-2xl border p-3 text-left transition-colors",
        active ? "border-brand-500 bg-brand-50" : "border-ink-200"
      )}
    >
      <Icon size={16} className="shrink-0 text-brand-600" />
      <div>
        <p className="text-sm font-bold text-ink-900">{title}</p>
        <p className="text-xs text-ink-500">{subtitle}</p>
      </div>
    </button>
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
