"use server";

import { prisma } from "@/lib/prisma";
import { createGuestOrder, getOrderByTrackingToken, createAccountFromGuest } from "@/lib/services/guest-checkout";
import { checkRateLimit } from "@/lib/services/rate-limit";
import type { ShippingInfo } from "@/lib/services/orders";
import { isClientPaymentMethod, type PaymentMethodId } from "@/lib/payments/provider";

// Scope note: guest checkout is deliberately narrower than the account-holder
// checkout in lib/actions/orders.ts — one product, one seller, prepaid only,
// no promo/coupon (guardrail: platform promos are account-only), SHIP or
// DIGITAL fulfillment only (no pickup/local-delivery, which lean on
// account-side conveniences like saved pickup preferences and an area
// cookie). Multi-item cart checkout still requires an account, since carts
// are inherently tied to a user record (Cart.userId is required) — building
// an anonymous multi-item cart is a materially bigger change than this spec
// asked for; flagging this as a disclosed scope boundary rather than
// silently half-building it.

export async function guestCheckoutAction(input: {
  productId: string;
  quantity: number;
  email: string;
  phone: string;
  shipping: ShippingInfo;
  paymentMethod: PaymentMethodId;
  shippingProviderId?: string;
  buyerProtectionOptIn?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Enter a valid email." };
  if (!isClientPaymentMethod(input.paymentMethod)) return { error: "Choose a valid payment method." };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 20) return { error: "Choose a quantity between 1 and 20." };
  if (!input.phone.trim()) return { error: "Enter a phone number." };

  // Keyed by email, not a userId (there isn't one) — same pattern as
  // requestPasswordResetAction, which faces the same logged-out-abuse shape.
  if (!(await checkRateLimit(`guest-checkout:${email}`, 5, 15 * 60_000))) {
    return { error: "Too many attempts. Please wait a while before trying again." };
  }

  const result = await createGuestOrder({ ...input, email });
  if ("error" in result) return result;
  return { success: true as const, orderId: result.orderId, orderNumber: result.orderNumber, trackingUrl: result.trackingUrl };
}

/** Powers /orders/track?token=... — rate-limited per token to blunt brute-force
 * guessing even though the token itself is a 32-byte random value. */
export async function getGuestOrderAction(token: string) {
  if (!token) return { error: "Invalid link." };
  if (!(await checkRateLimit(`guest-track:${token}`, 20, 15 * 60_000))) {
    return { error: "Too many attempts. Please wait a while before trying again." };
  }

  const order = await getOrderByTrackingToken(token);
  if (!order) return { error: "This tracking link is invalid or has expired." };

  return {
    success: true as const,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      buyerProtectionFee: order.buyerProtectionFee,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      guestEmail: order.guestEmail,
      shippingName: order.shippingName,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingProvince: order.shippingProvince,
      shippingPostalCode: order.shippingPostalCode,
      seller: { shopName: order.seller.shopName, handle: order.seller.handle },
      items: order.items.map((i) => ({ id: i.id, title: i.title, imageUrl: i.imageUrl, unitPrice: i.unitPrice, quantity: i.quantity })),
      shipment: order.shipment ? { status: order.shipment.status, trackingNumber: order.shipment.trackingNumber, courierName: order.shipment.courierName } : null,
      hasDispute: !!order.dispute,
      hasReview: !!order.review,
    },
  };
}

/** The post-purchase "Create an account" nudge — see createAccountFromGuest
 * for why this is effectively one field (password). The client signs the new
 * account in immediately via next-auth/react's signIn("credentials", ...)
 * after this returns success. */
export async function convertGuestToAccountAction(email: string, name: string, password: string) {
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password.length > 128) return { error: "Password is too long." };
  if (!(await checkRateLimit(`guest-convert:${email.trim().toLowerCase()}`, 5, 15 * 60_000))) {
    return { error: "Too many attempts. Please wait a while before trying again." };
  }
  return createAccountFromGuest(email, name, password);
}

/** A guest disputing an order they never created an account for — the
 * redress duty applies to them exactly as it does to a registered buyer, so
 * this feeds the same Dispute model and admin queue, just authenticated by
 * the tracking token instead of a session (see the nullable
 * Dispute.raisedById). Like submitDisputeAction, this never checks whether
 * the order was Buyer-Protection-covered — the free redress path is always
 * available regardless of that opt-in. */
export async function submitGuestDisputeAction(token: string, reason: string, details: string) {
  if (!(await checkRateLimit(`guest-track:${token}`, 20, 15 * 60_000))) {
    return { error: "Too many attempts. Please wait a while before trying again." };
  }
  const order = await getOrderByTrackingToken(token);
  if (!order) return { error: "This tracking link is invalid or has expired." };
  if (order.dispute) return { error: "A dispute is already open for this order." };
  if (["CANCELLED", "DISPUTED", "PAYMENT_PENDING"].includes(order.status) || order.paymentStatus === "REFUNDED") {
    return { error: "This order can't be disputed right now." };
  }
  const reasonText = String(reason ?? "").trim();
  const detailsText = String(details ?? "").trim();
  if (!reasonText || reasonText.length > 200 || detailsText.length > 3000) return { error: "Please describe the problem (keep it under 3000 characters)." };

  await prisma.dispute.create({ data: { orderId: order.id, raisedById: null, reason: reasonText, details: detailsText } });
  await prisma.order.update({ where: { id: order.id }, data: { status: "DISPUTED" } });
  return { success: true };
}
