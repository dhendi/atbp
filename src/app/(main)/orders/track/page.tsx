import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Package, ShieldCheck } from "lucide-react";
import { formatPeso, timeAgo } from "@/lib/utils";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { getOrderByTrackingToken } from "@/lib/services/guest-checkout";
import { GuestDisputeButton } from "./guest-dispute-button";

export const dynamic = "force-dynamic";

export default async function GuestOrderTrackingPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token || !(await checkRateLimit(`guest-track:${token}`, 20, 15 * 60_000))) {
    return <InvalidLink />;
  }

  const order = await getOrderByTrackingToken(token);
  if (!order) return <InvalidLink />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <div className="mb-5 flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 p-3.5 text-sm text-brand-800">
        <ShieldCheck size={16} className="shrink-0" />
        You&apos;re viewing this order via your personal tracking link. No account needed.
      </div>

      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">{order.orderNumber}</h1>
      <p className="mb-6 text-sm text-ink-500">{order.seller.shopName} · placed {timeAgo(order.createdAt)}</p>

      <div className="mb-5 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
              <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-900">{item.title}</p>
              <p className="text-xs text-ink-500">Qty {item.quantity} · {formatPeso(item.unitPrice)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 rounded-2xl border border-ink-100 bg-white p-4">
        <div className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><Package size={15} /> Status: {order.status.replace(/_/g, " ")}</div>
        {order.shipment && (
          <p className="mt-1 text-sm text-ink-600">
            {order.shipment.courierName ? `${order.shipment.courierName}: ` : ""}
            {order.shipment.trackingNumber ? `Tracking #${order.shipment.trackingNumber}` : order.shipment.status.replace(/_/g, " ")}
          </p>
        )}
        {order.deliveredAt && <p className="mt-1 text-xs text-ink-400">Delivered {timeAgo(order.deliveredAt)}</p>}
      </div>

      <div className="mb-5 rounded-2xl border border-ink-100 bg-white p-4 text-sm text-ink-600">
        <p className="mb-1 font-bold text-ink-900">Delivery details</p>
        <p>{order.shippingName}</p>
        <p>{order.shippingAddress}, {order.shippingCity}, {order.shippingProvince} {order.shippingPostalCode}</p>
      </div>

      <div className="space-y-1 rounded-2xl border border-ink-100 bg-white p-4 text-sm">
        <div className="flex justify-between text-ink-600"><span>Subtotal</span><span>{formatPeso(order.subtotal)}</span></div>
        <div className="flex justify-between text-ink-600"><span>Shipping fee</span><span>{formatPeso(order.shippingFee)}</span></div>
        {order.buyerProtectionFee > 0 && <div className="flex justify-between text-ink-600"><span>Buyer Protection</span><span>{formatPeso(order.buyerProtectionFee)}</span></div>}
        <div className="flex justify-between border-t border-ink-100 pt-1.5 font-extrabold text-ink-900"><span>Total</span><span>{formatPeso(order.total)}</span></div>
      </div>

      <div className="mt-6">
        {order.dispute ? (
          <p className="text-sm text-ink-500">A dispute is already open for this order. Our team is reviewing it.</p>
        ) : (
          <GuestDisputeButton token={token} />
        )}
      </div>
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <AlertTriangle size={32} className="mx-auto mb-3 text-ink-300" />
      <h1 className="text-lg font-bold text-ink-900">This tracking link is invalid or has expired</h1>
      <p className="mt-2 text-sm text-ink-500">
        If you have an account, you can find your orders from{" "}
        <Link href="/orders" className="font-semibold text-brand-600 hover:underline">My Orders</Link> instead.
      </p>
    </div>
  );
}
