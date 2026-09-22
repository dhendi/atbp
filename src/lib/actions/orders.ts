"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrder, updateOrderStatus, type ShippingInfo } from "@/lib/services/orders";
import { reserveInventory, releaseInventory } from "@/lib/services/inventory";
import { tryApplyPromoCode } from "@/lib/services/promo";
import { previewCoupon, finalizeCouponUsage } from "@/lib/services/coupons";
import { getSelectedArea } from "@/lib/services/local";
import { expireOverdueYardSales } from "@/lib/services/yard-sale";
import { codCapableProviderActive } from "@/lib/shipping/registry";
import { createShipmentForOrder, createPickupShipment, confirmShipmentDelivered } from "@/lib/shipping/lifecycle";
import type { PaymentMethodId } from "@/lib/payments/provider";
import { logProductEvent } from "@/lib/trending";
import { recomputeSellerRating } from "@/lib/services/reviews";
import { evaluateOrderForFraud } from "@/lib/services/fraud";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { notify } from "@/lib/services/notifications";
import { reviewInputSchema, shippingInfoSchema, disputeInputSchema, firstIssue } from "@/lib/validation";

type FulfillmentMethod = "SHIP" | "PICKUP" | "LOCAL_DELIVERY" | "DIGITAL";

export async function checkoutAction(
  cartItemIds: string[],
  shipping: ShippingInfo,
  paymentMethod: PaymentMethodId,
  promoCode?: string,
  fulfillmentMethod?: FulfillmentMethod,
  shippingProviderId?: string,
  buyerProtectionOptIn?: boolean
) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  if (!(await checkRateLimit(`checkout:${session.user.id}`, 10, 5 * 60_000))) {
    return { error: "Too many checkout attempts. Please wait a few minutes and try again." };
  }

  // A crafted request (not the real checkout UI, which always sends complete
  // shipping fields) could otherwise reach createOrder with an empty/absurdly
  // long address and corrupt what a seller ships to.
  const shippingResult = shippingInfoSchema.safeParse(shipping);
  if (!shippingResult.success) return { error: firstIssue(shippingResult) };
  shipping = shippingResult.data;

  // COD only makes sense when a courier that can actually collect and remit
  // it is active — manual tracking can't. Mirrors the checkout UI's own
  // filter (see codEligible in checkout-client.tsx); this is the backend
  // checkpoint in case that's ever bypassed.
  if (paymentMethod === "COD" && !codCapableProviderActive()) {
    return { error: "Cash on Delivery isn't available right now." };
  }
  // Pickup is prepaid/online only — "pay cash when you collect it" is
  // functionally COD with the same commission-collection problem, so it's
  // deliberately not offered here (phase-2 idea at most). Mirrors the
  // checkout UI's own payment-method filter when PICKUP is selected.
  if (paymentMethod === "COD" && fulfillmentMethod === "PICKUP") {
    return { error: "Cash on Delivery isn't available for pickup orders." };
  }

  const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } });
  if (!cart) return { error: "Cart not found." };

  // Catches a Yard Sale item whose sale ended (or any other listing pulled)
  // since it was added to cart — there's no cron in this app, so expiry is
  // lazy; this is the last checkpoint before money moves.
  await expireOverdueYardSales();

  const items = await prisma.cartItem.findMany({
    where: { id: { in: cartItemIds }, cartId: cart.id },
    include: { product: { include: { seller: true } } },
  });
  if (items.length === 0) return { error: "No items selected." };

  // A BUY_NOW cart item reserves its own stock the moment it's created (see
  // buyNowAction) — for a single-unit item that reservation itself flips the
  // product to SOLD_OUT immediately, before the buyer ever reaches checkout.
  // That SOLD_OUT is this buyer's own hold, not evidence someone else beat
  // them to it, so it must not block their own checkout. A regular
  // (MARKETPLACE) item going SOLD_OUT before checkout genuinely does mean
  // someone else bought the last one, so that case still blocks.
  const unavailable = items.find((i) => {
    if (i.product.status === "ACTIVE") return false;
    if (i.product.status === "SOLD_OUT" && i.sourceType === "BUY_NOW") return false;
    return true;
  });
  if (unavailable) {
    return { error: `"${unavailable.product.title}" is no longer available. Remove it from your cart to continue.` };
  }

  const buyerArea = fulfillmentMethod === "LOCAL_DELIVERY" ? await getSelectedArea() : null;

  // Fulfillment is resolved per seller group below — a buyer's chosen method
  // only applies to a given seller's items if that seller actually supports it.
  // Unlike the pre-fix version of this function, there is no silent "SHIP"
  // fallback: a group that can't be fulfilled the buyer's way (or at all) makes
  // the whole checkout fail with a clear error, rather than quietly shipping an
  // item the seller marked pickup-only.
  function itemDeliveryAreas(item: (typeof items)[number]): string[] {
    return (item.product.localDeliveryAreas as string[] | null) ?? (item.product.seller.localDeliveryAreas as string[]);
  }

  function resolveFulfillment(sellerItems: typeof items): FulfillmentMethod | null {
    // Structural fact, not a buyer preference — an all-digital group can never ship or be picked up.
    if (sellerItems.every((i) => i.product.isDigital)) {
      return "DIGITAL";
    }
    if (fulfillmentMethod === "PICKUP" && sellerItems.every((i) => i.product.pickupAvailable && i.product.seller.pickupAvailable)) {
      return "PICKUP";
    }
    if (
      fulfillmentMethod === "LOCAL_DELIVERY" &&
      buyerArea &&
      sellerItems.every((i) => i.product.localDeliveryAvailable && i.product.seller.localDeliveryAvailable && itemDeliveryAreas(i).includes(buyerArea))
    ) {
      return "LOCAL_DELIVERY";
    }
    if (sellerItems.every((i) => i.product.shippingAvailable)) {
      return "SHIP";
    }
    return null;
  }

  const bySeller = new Map<string, typeof items>();
  for (const item of items) {
    const list = bySeller.get(item.product.sellerId) ?? [];
    list.push(item);
    bySeller.set(item.product.sellerId, list);
  }

  // Resolve every seller group up front, before touching inventory or creating
  // any order — a cart that can't be fulfilled the buyer's chosen way should
  // fail cleanly, not partially check out.
  const resolvedBySeller = new Map<string, FulfillmentMethod>();
  for (const [sellerId, sellerItems] of bySeller) {
    const resolved = resolveFulfillment(sellerItems);
    if (!resolved) {
      const shopName = sellerItems[0]?.product.seller.shopName ?? "This seller";
      return { error: `${shopName} doesn't offer that option for these items. Try pickup or local delivery instead.` };
    }
    resolvedBySeller.set(sellerId, resolved);
  }

  // Validate the promo code against every seller in the cart *before*
  // reserving inventory or creating any order — a code that matches no
  // seller here should fail the whole checkout, not partially apply.
  const promoBySeller = new Map<string, { promoCodeId: string; discountAmount: number }>();
  if (promoCode) {
    for (const [sellerId, sellerItems] of bySeller) {
      const sellerSubtotal = sellerItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const promo = await tryApplyPromoCode(promoCode, sellerId, sellerSubtotal, session.user.id);
      if (promo) promoBySeller.set(sellerId, promo);
    }
    if (promoBySeller.size === 0) {
      return { error: "That promo code isn't valid for these items." };
    }
  }

  // Auto-applied platform coupon (e.g. the first-purchase welcome offer) —
  // independent of the seller promo code above, computed off the whole
  // cart's subtotal, then split proportionally across each seller's
  // sub-order the same way a multi-seller cart already splits into orders.
  const cartSubtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const couponPreview = await previewCoupon(session.user.id, cartSubtotal);
  const couponBySeller = new Map<string, number>();
  if (couponPreview) {
    const sellerIds = [...bySeller.keys()];
    let remaining = couponPreview.discountAmount;
    sellerIds.forEach((sellerId, idx) => {
      const sellerItems = bySeller.get(sellerId)!;
      const sellerSubtotal = sellerItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const share =
        idx === sellerIds.length - 1
          ? remaining
          : Math.min(remaining, Math.round((sellerSubtotal / cartSubtotal) * couponPreview.discountAmount * 100) / 100);
      couponBySeller.set(sellerId, share);
      remaining -= share;
    });
  }

  const reservedNow: { productId: string; quantity: number }[] = [];
  for (const item of items) {
    if (item.sourceType === "MARKETPLACE") {
      const ok = await reserveInventory(item.productId, item.quantity);
      if (!ok) {
        for (const r of reservedNow) await releaseInventory(r.productId, r.quantity);
        return { error: `Sorry, "${item.product.title}" no longer has enough stock.` };
      }
      reservedNow.push({ productId: item.productId, quantity: item.quantity });
    }
  }

  const orderIds: string[] = [];
  for (const [sellerId, sellerItems] of bySeller) {
    const promo = promoBySeller.get(sellerId);
    const order = await createOrder({
      buyerId: session.user.id,
      sellerId,
      items: sellerItems.map((i) => ({
        productId: i.productId,
        title: i.product.title,
        imageUrl: (i.product.images as string[])[0] ?? "",
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        sourceType: i.sourceType as "BUY_NOW" | "MARKETPLACE" | "CLAIM" | "AUCTION",
        personalizationNote: i.personalizationNote,
      })),
      shipping,
      paymentMethod,
      promoCodeId: promo?.promoCodeId,
      discountAmount: promo?.discountAmount,
      couponId: couponPreview?.couponId,
      couponDiscountAmount: couponBySeller.get(sellerId),
      fulfillmentMethod: resolvedBySeller.get(sellerId)!,
      localDeliveryFee: sellerItems[0]?.product.seller.localDeliveryFee ?? undefined,
      shippingProviderId: resolvedBySeller.get(sellerId) === "SHIP" ? shippingProviderId : undefined,
      buyerProtectionOptIn,
    });
    orderIds.push(order.id);
    await evaluateOrderForFraud(order);

    // No separate "shipped" step exists for a pickup order — the code the
    // buyer shows the seller is generated right away, same moment the order
    // itself is placed. See createPickupShipment for why.
    if (resolvedBySeller.get(sellerId) === "PICKUP") {
      await createPickupShipment(order.id);
    }
  }

  // Every split order from this checkout has now recorded its share of the
  // redemption — spend the coupon itself exactly once.
  if (couponPreview) {
    await finalizeCouponUsage(couponPreview.couponId);
  }

  await prisma.cartItem.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });

  for (const item of items) {
    await logProductEvent(item.productId, "PURCHASE", session.user.id);
  }

  // Remember this shipping info for next time — only when it's a real address
  // (not the "Local pickup"/"—" placeholders the client sends for pickup-only orders).
  if (shipping.address && shipping.address !== "Local pickup" && shipping.city && shipping.city !== "—") {
    const existingDefault = await prisma.address.findFirst({ where: { userId: session.user.id, isDefault: true } });
    const addressData = {
      fullName: shipping.name,
      phone: shipping.phone,
      line1: shipping.address,
      city: shipping.city,
      province: shipping.province,
      postalCode: shipping.postalCode,
    };
    if (existingDefault) {
      await prisma.address.update({ where: { id: existingDefault.id }, data: addressData });
    } else {
      await prisma.address.create({ data: { ...addressData, userId: session.user.id, isDefault: true } });
    }
  }

  revalidatePath("/cart");
  revalidatePath("/orders");
  revalidatePath("/addresses");
  return { success: true, orderIds };
}

export async function updateOrderStatusAction(orderId: string, status: string, trackingNumber?: string, courier?: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { seller: true } });
  if (!order) return { error: "Order not found." };
  if (order.seller.userId !== session.user.id && session.user.role !== "ADMIN") {
    return { error: "Not authorized." };
  }

  // For courier-shipped orders, DELIVERED/COMPLETED are no longer something
  // the seller sets directly — the buyer's own "Order received" confirmation
  // (or the auto-confirm fallback) owns that transition instead, since that's
  // what the returns/payout window actually keys off. A pickup order's seller
  // is trusted to self-report here instead (see createPickupShipment) since
  // they physically handed the item over, unlike a courier claim — so a
  // pickup "Completed" still has to route through the same Shipment record
  // rather than a bare status flip, just via the seller's own action.
  // Local delivery/digital have no shipment at all, so the seller keeps full
  // manual control there exactly as before.
  if (order.fulfillmentMethod === "SHIP" && (status === "DELIVERED" || status === "COMPLETED")) {
    return { error: "This order updates automatically once the buyer confirms receipt (or after the auto-confirm window)." };
  }

  if (order.fulfillmentMethod === "PICKUP" && (status === "DELIVERED" || status === "COMPLETED")) {
    const shipment = await prisma.shipment.findUnique({ where: { orderId } });
    if (!shipment) return { error: "Pickup isn't ready yet." };
    const result = await confirmShipmentDelivered(shipment.id, { buyerConfirmed: false });
    if ("error" in result) return result;
  } else if (order.fulfillmentMethod === "SHIP" && status === "SHIPPED") {
    const result = await createShipmentForOrder(orderId, {
      providerId: order.shippingProviderId ?? "MANUAL",
      trackingNumber,
      courierName: courier,
    });
    if ("error" in result) return result;
  } else {
    await updateOrderStatus(orderId, status);
  }
  revalidatePath("/studio/orders");
  revalidatePath("/orders");
  return { success: true };
}

export async function cancelOrderAction(orderId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, serviceOrder: true, seller: true } });
  if (!order || order.buyerId !== session.user.id) return { error: "Not authorized." };
  if (!["PAYMENT_PENDING", "PROCESSING"].includes(order.status)) {
    return { error: "This order can no longer be cancelled." };
  }
  // A Service order's status stays "PROCESSING" all the way through delivery
  // (see ServiceOrder.status instead) — without this, a buyer could cancel
  // for a full "refund" after the seller has already done the work. Once a
  // brief is submitted the seller is committed, so cancellation closes here;
  // report a problem is still available if something goes wrong after that.
  if (order.serviceOrder && order.serviceOrder.status !== "AWAITING_BRIEF") {
    return { error: "This service is already in progress and can no longer be cancelled. Report a problem if something's wrong." };
  }
  // A Digital Product's download tokens are issued the instant the order is
  // created (see issueDigitalDownloadTokens) — the buyer already has the
  // file by the time this could run, so cancelling (and "refunding") makes
  // no sense; report a problem covers a corrupt/not-as-described file instead.
  if (order.fulfillmentMethod === "DIGITAL_PRODUCT") {
    return { error: "Digital products can't be cancelled once purchased. Report a problem if the file is missing, corrupt, or not as described." };
  }

  for (const item of order.items) {
    await releaseInventory(item.productId, item.quantity);
  }
  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED", paymentStatus: "REFUNDED" } });
  await notify(order.seller.userId, "ORDER_CANCELLED", "Order cancelled", `${order.orderNumber} was cancelled by the buyer.`, "/studio/orders");
  revalidatePath("/orders");
  return { success: true };
}

/** The buyer's own "Order received"/"I picked this up" confirmation — the
 * primary way a SHIP or PICKUP order closes out early instead of waiting for
 * the auto-confirm window (see AUTO_CONFIRM_DAYS in lib/shipping/lifecycle.ts). */
export async function confirmOrderReceivedAction(orderId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { shipment: true } });
  if (!order || order.buyerId !== session.user.id) return { error: "Not authorized." };
  if (!order.shipment) return { error: "This order isn't ready to confirm yet." };
  if (order.shipment.status === "DELIVERED") return { success: true };

  const result = await confirmShipmentDelivered(order.shipment.id, { buyerConfirmed: true });
  if ("error" in result) return result;
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true };
}

export async function submitReviewAction(orderId: string, rating: number, comment: string, productId?: string, photos?: string[]) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  if (!(await checkRateLimit(`review:${session.user.id}`, 20, 60 * 60_000))) {
    return { error: "Too many reviews submitted. Please wait a while and try again." };
  }

  const reviewResult = reviewInputSchema.safeParse({ rating, comment });
  if (!reviewResult.success) return { error: firstIssue(reviewResult) };
  ({ rating, comment } = reviewResult.data);

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, seller: true } });
  if (!order || order.buyerId !== session.user.id) return { error: "Not authorized." };
  // Mirrors the frontend's own `canReview` gate in order-actions.tsx — that
  // check alone isn't enforcement, since this action is reachable directly.
  // Only a COMPLETED order (the settled end state, past DELIVERED) is
  // eligible; a still-processing, cancelled, or disputed order is not a
  // "completed purchase" yet, however far along it looks.
  if (order.status !== "COMPLETED") return { error: "This order isn't eligible for a review yet." };

  const existingReview = await prisma.review.findUnique({ where: { orderId } });
  if (existingReview) return { error: "You've already reviewed this order." };

  // Only allow reviewing a product that was actually part of this order.
  const validProductId = productId && order.items.some((i) => i.productId === productId) ? productId : order.items[0]?.productId;

  const review = await prisma.review.create({
    data: { orderId, sellerId: order.sellerId, productId: validProductId, buyerId: session.user.id, rating, comment, photos: photos ?? [] },
  });
  await notify(order.seller.userId, "REVIEW_RECEIVED", "New review received", `${order.orderNumber} was just reviewed: ${rating}★.`, `/studio/reviews`);

  await recomputeSellerRating(order.sellerId);

  revalidatePath(`/orders/${orderId}`);
  if (validProductId) revalidatePath(`/product/${validProductId}`);
  revalidatePath(`/seller/${order.sellerId}`);
  return { success: true, review };
}

// The RA 11967 redress path — deliberately never checks buyerProtectionFee/
// buyerProtectionOptIn. Every buyer can file a dispute regardless of whether
// they paid for Buyer Protection; only the *guarantee* (a platform-funded
// refund vs. one that depends on recovering from the seller) depends on that.
// See the "Protected"/"Not protected" badge in admin/disputes for where that
// distinction actually gets used.
export async function submitDisputeAction(orderId: string, reason: string, details: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  if (!(await checkRateLimit(`dispute:${session.user.id}`, 10, 60 * 60_000))) {
    return { error: "Too many disputes submitted. Please wait a while and try again." };
  }

  const disputeResult = disputeInputSchema.safeParse({ reason, details });
  if (!disputeResult.success) return { error: firstIssue(disputeResult) };
  ({ reason, details } = disputeResult.data);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== session.user.id) return { error: "Not authorized." };

  await prisma.dispute.create({ data: { orderId, raisedById: session.user.id, reason, details } });
  await prisma.order.update({ where: { id: orderId }, data: { status: "DISPUTED" } });
  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}
