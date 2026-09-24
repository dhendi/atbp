import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/services/orders";
import { getShippingProvider } from "./registry";
import type { ShippingAddress } from "./types";

/** Days after shipping before a SHIP-fulfillment order auto-confirms as
 * delivered if the buyer never taps "Order received" — matches the return
 * window already referenced in seller return-policy copy across the app. */
export const AUTO_CONFIRM_DAYS = 7;

/** Called when a seller marks a SHIP-fulfillment order "Shipped" — books
 * (booking-capable providers) or just records (manual) the shipment, and
 * schedules the lazy auto-confirm check. Only ever one Shipment per order. */
export async function createShipmentForOrder(
  orderId: string,
  input: { providerId: string; trackingNumber?: string; courierName?: string }
) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { seller: { include: { user: true } } } });
  if (!order) return { error: "Order not found." };
  if (order.fulfillmentMethod !== "SHIP") return { error: "This order isn't fulfilled by courier shipping." };

  const provider = getShippingProvider(input.providerId);
  if (!provider) return { error: "That shipping provider isn't available." };

  const pickup: ShippingAddress = {
    name: order.seller.shopName,
    phone: order.seller.user.phone ?? "",
    address: order.seller.publicAddress ?? order.seller.province ?? "",
    city: order.seller.province ?? "",
    province: order.seller.province ?? "",
    postalCode: "",
  };
  const dropoff: ShippingAddress = {
    name: order.shippingName,
    phone: order.shippingPhone,
    address: order.shippingAddress,
    city: order.shippingCity,
    province: order.shippingProvince,
    postalCode: order.shippingPostalCode,
  };
  const isCOD = order.paymentMethod === "COD";

  const result = await provider.createShipment({
    orderId,
    declaredValue: order.subtotal,
    isCOD,
    codAmount: isCOD ? order.total : undefined,
    pickup,
    dropoff,
    trackingNumber: input.trackingNumber,
    courierName: input.courierName,
  });
  if (!result.success) return { error: result.error ?? "Couldn't create the shipment." };

  const now = new Date();
  const autoConfirmAt = new Date(now.getTime() + AUTO_CONFIRM_DAYS * 86400000);

  await prisma.shipment.upsert({
    where: { orderId },
    create: {
      orderId,
      providerId: provider.id,
      courierName: input.courierName,
      trackingNumber: result.trackingNumber,
      providerRef: result.providerRef,
      status: result.status,
      declaredValue: order.subtotal,
      shippedAt: now,
      autoConfirmAt,
      codAmount: isCOD ? order.total : undefined,
      codCollectionStatus: isCOD ? "PENDING" : undefined,
    },
    update: {
      providerId: provider.id,
      courierName: input.courierName,
      trackingNumber: result.trackingNumber,
      providerRef: result.providerRef,
      status: result.status,
      shippedAt: now,
      autoConfirmAt,
    },
  });

  await updateOrderStatus(orderId, "SHIPPED");
  return { success: true };
}

/** Called right at order creation for a PICKUP-fulfillment order — there's no
 * separate "shipped" step for a pickup the way there is for a courier, so the
 * code (reusing Shipment.trackingNumber) and the 7-day auto-confirm clock
 * both start immediately, same as a SHIP shipment's clock starts the moment
 * it's marked shipped. Either the seller marking the order "Completed" (they
 * physically handed it over, so unlike SHIP they're trusted to self-report)
 * or the buyer tapping "Order received" — or the auto-confirm fallback —
 * closes it out via confirmShipmentDelivered below, exactly like SHIP. */
export async function createPickupShipment(orderId: string) {
  const provider = getShippingProvider("PICKUP");
  if (!provider) return { error: "Pickup isn't available right now." };

  const result = await provider.createShipment({
    orderId,
    declaredValue: 0,
    isCOD: false,
    pickup: EMPTY_ADDRESS,
    dropoff: EMPTY_ADDRESS,
  });
  if (!result.success) return { error: result.error ?? "Couldn't set up pickup for this order." };

  const now = new Date();
  await prisma.shipment.create({
    data: {
      orderId,
      providerId: provider.id,
      trackingNumber: result.trackingNumber,
      status: result.status,
      shippedAt: now,
      autoConfirmAt: new Date(now.getTime() + AUTO_CONFIRM_DAYS * 86400000),
    },
  });
  return { success: true };
}

const EMPTY_ADDRESS: ShippingAddress = { name: "", phone: "", address: "", city: "", province: "", postalCode: "" };

/** The buyer tapping "Order received" — the primary way a SHIP order closes
 * out (see AUTO_CONFIRM_DAYS for the fallback). Sets the shipment DELIVERED
 * and takes the order straight to COMPLETED, same as the auto-confirm path,
 * so review eligibility and payout release trigger identically either way. */
export async function confirmShipmentDelivered(shipmentId: string, opts: { buyerConfirmed: boolean }) {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) return { error: "Shipment not found." };
  if (shipment.status === "DELIVERED") return { success: true };

  // Delivery (manual, buyer confirmation, the auto-confirm sweep, or a
  // courier webhook) must never resurrect an order that was cancelled,
  // refunded, or is under dispute: doing so would flip it to COMPLETED,
  // release payout to the seller, and count a sale that was refunded.
  const order = await prisma.order.findUnique({ where: { id: shipment.orderId }, select: { status: true } });
  if (!order || ["CANCELLED", "DISPUTED", "COMPLETED"].includes(order.status)) {
    return { error: "This order can no longer be marked as delivered." };
  }

  const now = new Date();
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      status: "DELIVERED",
      deliveredAt: now,
      buyerConfirmedAt: opts.buyerConfirmed ? now : undefined,
    },
  });
  await updateOrderStatus(shipment.orderId, "COMPLETED");
  return { success: true };
}

/** Applies a normalized update from a provider's webhook/poll (see
 * ShippingProvider.handleWebhook) to whichever shipment it matches. This is
 * the one integration point a real courier adapter needs — a Ninja Van
 * webhook hitting api/webhooks/ninjavan calls straight into this, and it
 * behaves identically to the manual/auto-confirm path once it lands. */
export async function applyTrackingUpdate(match: { trackingNumber?: string; providerRef?: string }, update: { status: string; deliveredAt?: Date; codCollectionStatus?: string }) {
  if (!match.trackingNumber && !match.providerRef) return { error: "No tracking number or provider reference to match against." };

  const shipment = await prisma.shipment.findFirst({
    where: match.providerRef ? { providerRef: match.providerRef } : { trackingNumber: match.trackingNumber },
  });
  if (!shipment) return { error: "No matching shipment found." };

  if (update.status === "DELIVERED" && shipment.status !== "DELIVERED") {
    await confirmShipmentDelivered(shipment.id, { buyerConfirmed: false });
  } else {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: update.status,
        ...(update.codCollectionStatus ? { codCollectionStatus: update.codCollectionStatus } : {}),
      },
    });
  }
  return { success: true };
}

/** Also called from the daily maintenance cron (see api/cron/maintenance) as
 * a backstop — still called opportunistically from high-traffic order pages
 * too (buyer's /orders, /orders/[id], seller's /studio/orders), since the
 * cron is Hobby-plan-limited to once a day, too infrequent on its own.
 * Idempotent and cheap: a no-op once nothing is overdue. */
export async function autoConfirmOverdueShipments() {
  // IN_TRANSIT covers a courier shipment; PENDING covers a pickup shipment
  // (createPickupShipment never moves it to IN_TRANSIT — there's no transit
  // leg — so it would otherwise never be picked up by this sweep).
  const overdue = await prisma.shipment.findMany({
    where: { status: { in: ["IN_TRANSIT", "PENDING"] }, autoConfirmAt: { lte: new Date() } },
    select: { id: true },
  });
  for (const s of overdue) {
    await confirmShipmentDelivered(s.id, { buyerConfirmed: false });
  }
  return overdue.length;
}
