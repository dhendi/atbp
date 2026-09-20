import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Truck, MapPin, CreditCard, Store, Bike, ArrowRight, Download, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPeso, estimatedDeliveryRange } from "@/lib/utils";
import { getPublicLocationLabel } from "@/lib/local-shared";
import { OrderStatusBadge } from "@/components/domain/order-status-badge";
import { FoundingSellerBadge } from "@/components/domain/founding-seller-badge";
import { autoConfirmOverdueShipments } from "@/lib/shipping/lifecycle";
import { autoConfirmOverdueServiceOrders } from "@/lib/services/service-orders";
import { releaseOverdueDigitalProductHolds } from "@/lib/services/digital-products";
import { OrderActions } from "./order-actions";
import { ServiceOrderPanel } from "./service-order-panel";

const STATUS_STEPS = ["PAYMENT_PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED"];

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/orders/${id}`);

  await Promise.all([autoConfirmOverdueShipments(), autoConfirmOverdueServiceOrders(), releaseOverdueDigitalProductHolds()]);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { isDigital: true, digitalFileUrl: true, digitalFileUrls: true, digitalDeliveryInstructions: true } },
          digitalDownloadTokens: true,
        },
      },
      seller: true,
      review: true,
      dispute: true,
      shipment: true,
      serviceOrder: { include: { deliveries: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!order || order.buyerId !== session.user.id) notFound();

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const isTerminalBad = order.status === "CANCELLED" || order.status === "DISPUTED";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-ink-900">{order.orderNumber}</h1>
          <Link href={`/seller/${order.seller.handle}`} className="flex items-center gap-1.5 text-sm text-ink-500 hover:underline">
            {order.seller.shopName}
            {order.seller.foundingSeller && <FoundingSellerBadge />}
          </Link>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {!isTerminalBad && (
        <div className="mb-6 rounded-card border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <div className={`h-1 flex-1 ${i === 0 ? "invisible" : i <= currentStepIndex ? "bg-brand-500" : "bg-ink-100"}`} />
                  <div className={`h-3 w-3 shrink-0 rounded-full ${i <= currentStepIndex ? "bg-brand-500" : "bg-ink-200"}`} />
                  <div className={`h-1 flex-1 ${i === STATUS_STEPS.length - 1 ? "invisible" : i < currentStepIndex ? "bg-brand-500" : "bg-ink-100"}`} />
                </div>
                {/* Six full-word labels don't fit side by side on a phone screen without
                    running into each other — only show them where there's room. */}
                <span className="mt-1.5 hidden text-center text-[10px] font-semibold text-ink-500 md:block">{step.replace("_", " ")}</span>
              </div>
            ))}
          </div>
          {currentStepIndex >= 0 && (
            <p className="mt-2.5 text-center text-xs font-bold text-ink-700 md:hidden">
              {currentStepIndex + 1} of {STATUS_STEPS.length} · {STATUS_STEPS[currentStepIndex].replace("_", " ")}
            </p>
          )}
        </div>
      )}

      {order.fulfillmentMethod === "PICKUP" && (
        <section className="mb-4 rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900">
            <Store size={16} /> {order.seller.birVerified ? "Store Pickup" : "Local Pickup"}
          </h2>
          <p className="text-sm text-ink-800">{order.shippingName} · {order.shippingPhone}</p>
          <p className="text-sm text-ink-500">
            {order.seller.shopName}
            {getPublicLocationLabel(order.seller) ? ` · ${getPublicLocationLabel(order.seller)}` : ""}
          </p>
          {order.seller.pickupInstructions && (
            <p className="mt-2 rounded-xl bg-ink-50 p-3 text-sm text-ink-700">{order.seller.pickupInstructions}</p>
          )}
          {order.shipment?.trackingNumber && order.shipment.status !== "DELIVERED" && (
            <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-700">
              <KeyRound size={14} className="shrink-0" /> Show this code to the seller at pickup: {order.shipment.trackingNumber}
            </p>
          )}
        </section>
      )}

      {order.fulfillmentMethod === "LOCAL_DELIVERY" && (
        <section className="mb-4 rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900">
            <Bike size={16} /> Local Delivery
          </h2>
          <p className="text-sm text-ink-800">{order.shippingName} · {order.shippingPhone}</p>
          <p className="text-sm text-ink-500">
            {order.shippingAddress}, {order.shippingCity}, {order.shippingProvince} {order.shippingPostalCode}
          </p>
          <p className="mt-2 text-xs text-ink-500">Delivered directly by {order.seller.shopName}, not a courier shipment.</p>
        </section>
      )}

      {order.fulfillmentMethod === "DIGITAL" && (
        <section className="mb-4 rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900">
            <Download size={16} /> Digital Delivery
          </h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-semibold text-ink-800">{item.title}</p>
                {item.product?.digitalFileUrl ? (
                  <a
                    href={item.product.digitalFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
                  >
                    <Download size={13} /> Download your file
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-ink-500">Your download link will appear here once the seller confirms your order.</p>
                )}
                {item.product?.digitalDeliveryInstructions && (
                  <p className="mt-1 text-xs text-ink-500">{item.product.digitalDeliveryInstructions}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {order.fulfillmentMethod === "SERVICE" && order.serviceOrder && (
        <ServiceOrderPanel
          orderId={order.id}
          packageTier={order.serviceOrder.packageTier}
          deliveryDays={order.serviceOrder.deliveryDays}
          revisionsIncluded={order.serviceOrder.revisionsIncluded}
          revisionsUsed={order.serviceOrder.revisionsUsed}
          status={order.serviceOrder.status}
          requirementsBrief={order.serviceOrder.requirementsBrief}
          dueAt={order.serviceOrder.dueAt?.toISOString() ?? null}
          deliveries={order.serviceOrder.deliveries.map((d) => ({
            id: d.id,
            fileUrls: d.fileUrls as string[],
            message: d.message,
            createdAt: d.createdAt.toISOString(),
          }))}
        />
      )}

      {order.fulfillmentMethod === "DIGITAL_PRODUCT" && (
        <section className="mb-4 rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900">
            <Download size={16} /> Your Download{order.items.length > 1 ? "s" : ""}
          </h2>
          <div className="space-y-3">
            {order.items.map((item) => {
              const token = item.digitalDownloadTokens[0];
              const fileUrls = (item.product?.digitalFileUrls as string[] | null) ?? [];
              return (
                <div key={item.id}>
                  <p className="text-sm font-semibold text-ink-800">{item.title}</p>
                  {token && fileUrls.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {fileUrls.map((_, i) => (
                        <a
                          key={i}
                          href={`/api/downloads/${token.token}?file=${i}`}
                          className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
                        >
                          <Download size={13} /> Download file {fileUrls.length > 1 ? i + 1 : ""}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-ink-500">Your download link will appear here once payment is confirmed.</p>
                  )}
                  {item.product?.digitalDeliveryInstructions && (
                    <p className="mt-1 text-xs text-ink-500">{item.product.digitalDeliveryInstructions}</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-ink-400">
            Digital products are non-refundable once downloaded, except for not-as-described, corrupt/undeliverable files, or fraud. Report a
            problem below if something&apos;s wrong.
          </p>
        </section>
      )}

      {order.fulfillmentMethod === "SHIP" && (
        <section className="mb-4 rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900">
            <Truck size={16} /> Shipping
          </h2>
          <p className="text-sm text-ink-800">{order.shippingName} · {order.shippingPhone}</p>
          <p className="text-sm text-ink-500">
            {order.shippingAddress}, {order.shippingCity}, {order.shippingProvince} {order.shippingPostalCode}
          </p>
          {order.shipment?.trackingNumber && (
            <p className="mt-2 text-sm text-ink-700">
              <span className="font-semibold">{order.shipment.courierName}</span>: Tracking #{order.shipment.trackingNumber}
            </p>
          )}
        </section>
      )}

      <section className="mb-4 rounded-card border border-ink-100 bg-white p-4">
        <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900">
          <CreditCard size={16} /> Payment
        </h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">Method</span>
          <span className="font-semibold text-ink-800">{order.paymentMethod}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">Status</span>
          <span className="font-semibold text-ink-800">{order.paymentStatus}</span>
        </div>
        {order.fulfillmentMethod === "SERVICE" ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-brand-50 p-2.5 text-xs font-semibold text-brand-700">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            Payment is held by ATBP until you accept the delivery. The seller is only paid once you&apos;re satisfied (or the review window passes).
          </p>
        ) : order.fulfillmentMethod === "DIGITAL_PRODUCT" ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-brand-50 p-2.5 text-xs font-semibold text-brand-700">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            The seller&apos;s payout is held briefly after your purchase. Report a problem right away if the file is missing, corrupt, or not as described.
          </p>
        ) : order.buyerProtectionFee > 0 ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-brand-50 p-2.5 text-xs font-semibold text-brand-700">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            Covered by ATBP Buyer Protection: if this order never arrives or isn&apos;t as described, report a problem below for a refund review.
          </p>
        ) : (
          <p className="mt-3 text-xs text-ink-500">
            Not covered by ATBP Buyer Protection. You can still report a problem below, but any refund then depends on resolving it with the seller.
          </p>
        )}
      </section>

      <section className="mb-4 rounded-card border border-ink-100 bg-white p-4">
        <h2 className="mb-3 font-bold text-ink-900">Items</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{item.title}</p>
                <p className="text-xs text-ink-500">{item.sourceType.replace("_", " ")} · Qty {item.quantity}</p>
                {item.personalizationNote && (
                  <p className="mt-0.5 text-xs italic text-ink-500">&quot;{item.personalizationNote}&quot;</p>
                )}
              </div>
              <span className="text-sm font-bold text-ink-900">{formatPeso(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-sm">
          <div className="flex justify-between text-ink-500">
            <span>Subtotal</span>
            <span>{formatPeso(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-500">
            <span>{["DIGITAL", "DIGITAL_PRODUCT", "SERVICE"].includes(order.fulfillmentMethod) ? "Delivery" : "Shipping"}</span>
            <span>{formatPeso(order.shippingFee)}</span>
          </div>
          {order.buyerProtectionFee > 0 && (
            <div className="flex justify-between text-ink-500">
              <span>Buyer Protection</span>
              <span>{formatPeso(order.buyerProtectionFee)}</span>
            </div>
          )}
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-live-600">
              <span>Promo discount</span>
              <span>-{formatPeso(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-ink-900">
            <span>Total</span>
            <span>{formatPeso(order.total)}</span>
          </div>
        </div>
      </section>

      {order.fulfillmentMethod === "SHIP" && (
        <section className="mb-4 flex items-center gap-2 rounded-card border border-ink-100 bg-white p-4 text-sm text-ink-500">
          <MapPin size={16} /> Estimated delivery {estimatedDeliveryRange(order.createdAt, 3, 5)} via {order.shipment?.courierName ?? "your seller's preferred courier"}.
        </section>
      )}

      <OrderActions
        orderId={order.id}
        status={order.status}
        hasReview={!!order.review}
        hasDispute={!!order.dispute}
        items={order.items.map((i) => ({ productId: i.productId, title: i.title, imageUrl: i.imageUrl }))}
        canConfirmReceived={
          order.shipment?.status === "IN_TRANSIT" || (order.fulfillmentMethod === "PICKUP" && order.shipment?.status === "PENDING")
        }
        isPickup={order.fulfillmentMethod === "PICKUP"}
        disputeEligibleWhileProcessing={order.fulfillmentMethod === "SERVICE" || order.fulfillmentMethod === "DIGITAL_PRODUCT"}
        cancelDisabledReason={
          order.fulfillmentMethod === "DIGITAL_PRODUCT"
            ? "Digital products can't be cancelled once purchased."
            : order.serviceOrder && order.serviceOrder.status !== "AWAITING_BRIEF"
              ? "This service is already in progress."
              : undefined
        }
      />

      <div className="mt-2 flex gap-2 pb-8">
        <Button variant="outline" asChild>
          <Link href="/orders">Back to Orders</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">Continue Shopping <ArrowRight size={14} /></Link>
        </Button>
      </div>
    </div>
  );
}
