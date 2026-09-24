import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { sendEmail } from "@/lib/services/email";
import { getPaymentProvider, type PaymentMethodId } from "@/lib/payments/provider";
import { recordPromoRedemption } from "@/lib/services/promo";
import { recordCouponRedemption } from "@/lib/services/coupons";
import { recordCommission } from "@/lib/services/commission";
import { syncClosetMonthlySalesCap } from "@/lib/services/closet";
import { syncCasualListingMonthlySalesCap } from "@/lib/services/casual-listings";
import { buyerProtectionFeeFor, BUYER_PROTECTION_DEFAULT_ON } from "@/lib/fees";
import { getShippingProvider } from "@/lib/shipping/registry";
import { MANUAL_SHIPPING_FLAT_FEE } from "@/lib/shipping/providers/manual";

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface OrderItemInput {
  productId: string;
  title: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  sourceType: "BUY_NOW" | "MARKETPLACE" | "CLAIM" | "AUCTION";
  personalizationNote?: string | null;
}

async function uniqueOrderNumber() {
  for (let i = 0; i < 8; i++) {
    const candidate = `ATBP-${Math.floor(100000 + Math.random() * 900000)}`;
    const existing = await prisma.order.findUnique({ where: { orderNumber: candidate } });
    if (!existing) return candidate;
  }
  return `ATBP-${Date.now()}`;
}

export async function createOrder(params: {
  // Null for a guest checkout order — guestEmail/guestPhone identify the
  // buyer instead. See lib/actions/guest-checkout.ts, which is also the only
  // caller that should ever omit promoCodeId/couponId (guest orders never
  // get platform promos — see the guardrail notes there).
  buyerId: string | null;
  guestEmail?: string;
  guestPhone?: string;
  sellerId: string;
  items: OrderItemInput[];
  shipping: ShippingInfo;
  paymentMethod: PaymentMethodId;
  promoCodeId?: string;
  discountAmount?: number;
  couponId?: string;
  couponDiscountAmount?: number;
  fulfillmentMethod?: "SHIP" | "PICKUP" | "LOCAL_DELIVERY" | "DIGITAL" | "SERVICE" | "DIGITAL_PRODUCT";
  localDeliveryFee?: number;
  // Which active shipping-layer provider (see lib/shipping/registry.ts) the
  // buyer picked at checkout — only meaningful when fulfillmentMethod is
  // SHIP. Falls back to MANUAL if omitted or invalid, since that's always
  // active; the fee is always recomputed from the provider here rather than
  // trusted from the client.
  shippingProviderId?: string;
  // The buyer's checkout toggle — defaults to BUYER_PROTECTION_DEFAULT_ON so
  // callers that don't pass it (there shouldn't be any UI ones left) still
  // get the intended opt-out behavior rather than silently losing coverage.
  buyerProtectionOptIn?: boolean;
}) {
  const fulfillmentMethod = params.fulfillmentMethod ?? "SHIP";
  // Last line of defense for money integrity: whatever path built these items,
  // an order never gets created with a zero/negative/fractional quantity or a
  // negative/non-finite price (a negative quantity would produce a negative
  // subtotal, i.e. an order the seller "owes" the buyer for).
  if (params.items.length === 0) throw new Error("An order needs at least one item.");
  for (const i of params.items) {
    if (!Number.isInteger(i.quantity) || i.quantity < 1) throw new Error("Invalid item quantity.");
    if (!Number.isFinite(i.unitPrice) || i.unitPrice < 0) throw new Error("Invalid item price.");
  }
  const subtotal = params.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const resolvedShippingProviderId =
    fulfillmentMethod === "SHIP" ? (getShippingProvider(params.shippingProviderId ?? "MANUAL")?.id ?? "MANUAL") : null;
  let shippingFee: number;
  if (fulfillmentMethod === "PICKUP" || fulfillmentMethod === "DIGITAL" || fulfillmentMethod === "SERVICE" || fulfillmentMethod === "DIGITAL_PRODUCT") {
    shippingFee = 0;
  } else if (fulfillmentMethod === "LOCAL_DELIVERY") {
    shippingFee = params.localDeliveryFee ?? 0;
  } else if (subtotal > 0) {
    const provider = getShippingProvider(resolvedShippingProviderId ?? "MANUAL");
    const rate = provider?.getRate ? await provider.getRate({ declaredValue: subtotal }) : { fee: MANUAL_SHIPPING_FLAT_FEE };
    shippingFee = rate.fee;
  } else {
    shippingFee = 0;
  }
  const discountAmount = Math.min(params.discountAmount ?? 0, subtotal);
  const couponDiscountAmount = Math.min(params.couponDiscountAmount ?? 0, Math.max(0, subtotal - discountAmount));
  // Buyer Protection doesn't apply here — a Service is already escrow-
  // protected (see ServiceOrder) and a Digital Product delivers instantly, so
  // there's nothing left for the paid guarantee to cover. Forced off
  // regardless of what the buyer's checkbox says, rather than surfacing a fee
  // toggle that would always be a no-op for these two fulfillment methods.
  const buyerProtectionEligible = fulfillmentMethod !== "SERVICE" && fulfillmentMethod !== "DIGITAL_PRODUCT";
  const buyerProtectionOptIn = buyerProtectionEligible ? params.buyerProtectionOptIn ?? BUYER_PROTECTION_DEFAULT_ON : false;
  const buyerProtectionFee = buyerProtectionEligible ? buyerProtectionFeeFor(subtotal, params.paymentMethod, buyerProtectionOptIn) : 0;
  const total = subtotal + shippingFee + buyerProtectionFee - discountAmount - couponDiscountAmount;
  const orderNumber = await uniqueOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      buyerId: params.buyerId,
      guestEmail: params.buyerId ? null : params.guestEmail ?? null,
      guestPhone: params.buyerId ? null : params.guestPhone ?? null,
      sellerId: params.sellerId,
      subtotal,
      shippingFee,
      buyerProtectionFee,
      buyerProtectionOptIn,
      discountAmount,
      promoCodeId: params.promoCodeId ?? null,
      couponId: params.couponId ?? null,
      couponDiscountAmount,
      total,
      status: "PAYMENT_PENDING",
      fulfillmentMethod,
      shippingProviderId: fulfillmentMethod === "PICKUP" ? "PICKUP" : resolvedShippingProviderId,
      paymentMethod: params.paymentMethod,
      paymentStatus: "PENDING",
      shippingName: params.shipping.name,
      shippingPhone: params.shipping.phone,
      shippingAddress: params.shipping.address,
      shippingCity: params.shipping.city,
      shippingProvince: params.shipping.province,
      shippingPostalCode: params.shipping.postalCode,
      items: { create: params.items },
    },
    include: { items: true, seller: true },
  });

  // If any item in this order came from an accepted Tawad offer, link it now
  // — the offer's own `amount`/`counterAmount` already became this item's
  // unitPrice back at acceptance (see reserveForAcceptedOffer in
  // lib/services/tawad.ts), so no separate pricing logic is needed here.
  // Tawad requires being logged in to make an offer in the first place, so
  // this never applies to a guest (null buyerId) order.
  if (params.buyerId) {
    for (const item of order.items) {
      await prisma.offer.updateMany({
        where: { productId: item.productId, buyerId: params.buyerId, status: "ACCEPTED", orderId: null },
        data: { orderId: order.id },
      });
    }
  }

  // Guest orders never carry a promo/coupon — see the guardrail notes in
  // lib/actions/guest-checkout.ts — so params.buyerId is guaranteed non-null
  // whenever these actually run.
  if (params.promoCodeId && discountAmount > 0 && params.buyerId) {
    await recordPromoRedemption(params.promoCodeId, params.buyerId, order.id, discountAmount);
  }
  if (params.couponId && couponDiscountAmount > 0 && params.buyerId) {
    await recordCouponRedemption(params.couponId, params.buyerId, order.id, couponDiscountAmount);
  }

  // Commissioned on net item revenue (subtotal minus any promo/coupon
  // discount) — shipping passes through to the courier, it isn't ATBP's cut.
  await recordCommission(order.id, params.sellerId, Math.max(0, subtotal - discountAmount - couponDiscountAmount), params.paymentMethod);

  const provider = getPaymentProvider(params.paymentMethod);
  const result = await provider.createAndConfirm(total, order.id);

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: result.status,
      status: result.status === "SUCCEEDED" ? "PROCESSING" : result.status === "PENDING" ? "PROCESSING" : "PAYMENT_PENDING",
      payment: {
        create: {
          provider: params.paymentMethod,
          status: result.status,
          amount: total,
          providerRef: result.providerRef,
        },
      },
    },
    include: { items: true, seller: true },
  });

  // A guest has no in-app notification inbox to write to — their
  // confirmation is the email guestCheckoutAction sends with the magic-link
  // tracking URL instead.
  if (params.buyerId) {
    await notify(
      params.buyerId,
      "ORDER_CONFIRMED",
      "Order confirmed!",
      `Your order ${orderNumber} has been placed for ${formatPesoServer(total)}.`,
      "/orders"
    );
    if (result.status === "SUCCEEDED") {
      await notify(params.buyerId, "PAYMENT_RECEIVED", "Payment received", `Payment for ${orderNumber} was successful.`, `/orders/${order.id}`);
    }
  }
  await notifySeller(params.sellerId, "New order received!", `${orderNumber}: ${formatPesoServer(total)}`, "/studio/orders");

  return updated;
}

async function notifySeller(sellerId: string, title: string, body: string, linkUrl?: string) {
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return;
  await notify(seller.userId, "ORDER_CONFIRMED", title, body, linkUrl);
}

export async function updateOrderStatus(orderId: string, status: string) {
  const existing = await prisma.order.findUnique({ where: { id: orderId }, select: { deliveredAt: true } });
  const isFirstCompletion = (status === "DELIVERED" || status === "COMPLETED") && !existing?.deliveredAt;

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(isFirstCompletion ? { deliveredAt: new Date() } : {}),
    },
  });

  if (status === "SHIPPED") {
    if (order.buyerId) {
      await notify(order.buyerId, "ORDER_SHIPPED", "Order shipped", `Your order ${order.orderNumber} is on its way.`, "/orders");
    } else if (order.guestEmail) {
      await sendEmail(order.guestEmail, "Your order shipped", `Your order ${order.orderNumber} is on its way.`);
    }
  }
  // A DIGITAL_PRODUCT order was already "delivered" the instant it was paid
  // for (see issueDigitalDownloadTokens) — this transition is just the hold
  // window lapsing, not a new delivery event, so it stays silent to the buyer
  // rather than sending a confusing "delivered" notice days after they
  // already downloaded the file.
  if ((status === "DELIVERED" || status === "COMPLETED") && order.fulfillmentMethod !== "DIGITAL_PRODUCT") {
    if (order.buyerId) {
      await notify(order.buyerId, "ORDER_DELIVERED", "Order delivered", `Your order ${order.orderNumber} has been delivered.`, "/orders");
    } else if (order.guestEmail) {
      await sendEmail(order.guestEmail, "Your order was delivered", `Your order ${order.orderNumber} has been delivered.`);
    }
  }
  // Only the first DELIVERED/COMPLETED transition counts toward the seller's
  // real sales count (feeds the SALES_100/SALES_1000/RISING_SELLER badge
  // criteria in lib/services/badges.ts) and the Closet's monthly sales cap —
  // deliveredAt being set is what makes this idempotent even if the status
  // moves DELIVERED -> COMPLETED later. My Shop sellers are always
  // birVerified (no monthly cap) so the cap check only ever does real work
  // for orders touching Closet items; Yard Sale items have no sales cap at all.
  if (isFirstCompletion) {
    await prisma.sellerProfile.update({ where: { id: order.sellerId }, data: { totalSales: { increment: 1 } } });

    const hasClosetItem = await prisma.orderItem.findFirst({ where: { orderId, product: { closetId: { not: null } } }, select: { id: true } });
    if (hasClosetItem) {
      const closet = await prisma.closet.findUnique({ where: { sellerId: order.sellerId }, select: { id: true } });
      if (closet) await syncClosetMonthlySalesCap(closet.id);
    }
    // Same idempotent-on-first-completion shape as the Closet cap above, for
    // the separate Service/Digital-Product casual cap pool.
    const hasCasualListingItem = await prisma.orderItem.findFirst({
      where: { orderId, product: { kind: { in: ["SERVICE", "DIGITAL_PRODUCT"] } } },
      select: { id: true },
    });
    if (hasCasualListingItem) {
      await syncCasualListingMonthlySalesCap(order.sellerId);
    }
  }
  return order;
}

function formatPesoServer(amount: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount);
}
