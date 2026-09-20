"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrder, updateOrderStatus } from "@/lib/services/orders";
import { assertCanCreateListing, assertCanActivateListings } from "@/lib/services/seller-plan";
import { assertCanAddCasualListing } from "@/lib/services/casual-listings";
import { SERVICE_AUTO_CONFIRM_DAYS } from "@/lib/services/service-orders";
import { notify } from "@/lib/services/notifications";
import type { PaymentMethodId } from "@/lib/payments/provider";
import { sellerInactiveMessage, idVerificationBlockMessage } from "@/lib/constants";
import { listingTitleDescriptionSchema, servicePackageInputSchema, sellerIdVerificationInputSchema, firstIssue } from "@/lib/validation";

async function requireSeller() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
}

/** For a brand-new user with no SellerProfile yet — mirrors
 * becomeClosetSellerAction's auto-approved shape exactly, minus creating a
 * Closet (Services don't need a container model). */
export async function becomeCasualServiceSellerAction(input: {
  shopName: string;
  handle: string;
  province: string;
  idDocumentType: string;
  idDocumentUrl: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const existing = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (existing) return { error: "You already have a seller account." };

  const handleTaken = await prisma.sellerProfile.findUnique({ where: { handle: input.handle } });
  if (handleTaken) return { error: "That shop handle is already taken." };

  const idResult = sellerIdVerificationInputSchema.safeParse({ idDocumentType: input.idDocumentType, idDocumentUrl: input.idDocumentUrl });
  if (!idResult.success) return { error: firstIssue(idResult) };

  const seller = await prisma.sellerProfile.create({
    data: {
      userId: session.user.id,
      shopName: input.shopName,
      handle: input.handle,
      province: input.province,
      sellerKind: "INDIVIDUAL",
      idDocumentType: idResult.data.idDocumentType,
      idDocumentUrl: idResult.data.idDocumentUrl,
      idSubmittedAt: new Date(),
      status: "APPROVED",
    },
  });
  await prisma.user.update({ where: { id: session.user.id }, data: { role: "SELLER" } });
  return { success: true, sellerId: seller.id };
}

export interface ServicePackageInput {
  tier: "BASIC" | "STANDARD" | "PREMIUM";
  price: number;
  deliverables: string;
  deliveryDays: number;
  revisionsIncluded: number;
}

export interface ServiceInput {
  title: string;
  description: string;
  categoryId: string;
  images: string[];
  packages: ServicePackageInput[];
  rightsAttested: boolean;
}

export async function createServiceAction(input: ServiceInput) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account. Set one up from Sell on ATBP first." };
  const inactiveMessage = sellerInactiveMessage(seller.status);
  if (inactiveMessage) return { error: inactiveMessage };
  const idBlockMessage = idVerificationBlockMessage(seller);
  if (idBlockMessage) return { error: idBlockMessage };

  if (!input.rightsAttested) return { error: "Please confirm you own or are licensed to offer this service." };
  if (input.images.length === 0) return { error: "Add at least one sample/portfolio image." };
  if (input.packages.length === 0 || input.packages.length > 3) return { error: "Add 1 to 3 packages." };

  const titleDescResult = listingTitleDescriptionSchema.safeParse({ title: input.title, description: input.description });
  if (!titleDescResult.success) return { error: firstIssue(titleDescResult) };
  input.title = titleDescResult.data.title;
  input.description = titleDescResult.data.description;

  for (const pkg of input.packages) {
    if (!pkg.price || pkg.price <= 0) return { error: `Set a price for the ${pkg.tier} package.` };
    if (!pkg.deliverables.trim()) return { error: `Describe what's included in the ${pkg.tier} package.` };
    if (!pkg.deliveryDays || pkg.deliveryDays <= 0) return { error: `Set a delivery time for the ${pkg.tier} package.` };
    if (pkg.revisionsIncluded < 0) return { error: `Revisions included can't be negative (${pkg.tier}).` };

    const packageResult = servicePackageInputSchema.safeParse(pkg);
    if (!packageResult.success) return { error: `${pkg.tier} package: ${firstIssue(packageResult)}` };
    pkg.deliverables = packageResult.data.deliverables;
  }

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) return { error: "Choose a valid category." };

  if (seller.birVerified) {
    const quota = await assertCanCreateListing(seller.id);
    if (!quota.allowed) return { error: quota.error };
    const activate = await assertCanActivateListings(seller.id);
    if (!activate.allowed) return { error: activate.error };
  } else {
    const cap = await assertCanAddCasualListing(seller.id);
    if (!cap.allowed) return { error: cap.error };
  }

  const orderedPackages = [...input.packages].sort((a, b) => a.price - b.price);
  const product = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      images: input.images,
      price: orderedPackages[0].price, // lowest package price — shown on cards/search
      quantity: 999_999,
      quantityAvailable: 999_999,
      type: "CUSTOM",
      condition: "BRAND_NEW",
      sellingModes: ["BUY_NOW"],
      listingType: "FIXED",
      status: "ACTIVE",
      shippingAvailable: false,
      kind: "SERVICE",
      rightsAttestedAt: new Date(),
      servicePackages: {
        create: orderedPackages.map((pkg, i) => ({
          tier: pkg.tier,
          price: pkg.price,
          deliverables: pkg.deliverables,
          deliveryDays: pkg.deliveryDays,
          revisionsIncluded: pkg.revisionsIncluded,
          order: i,
        })),
      },
    },
  });

  revalidatePath("/studio/products");
  revalidatePath("/services");
  return { success: true, productId: product.id };
}

/** Buyer picks a package and orders — payment is held (escrow) until the
 * buyer accepts delivery or the auto-confirm window passes. No cart, no
 * guest checkout: this is a single-package, logged-in-only purchase, same
 * scope boundary as guest checkout's own single-product simplification. */
export async function orderServiceAction(
  packageId: string,
  shipping: { name: string; phone: string },
  paymentMethod: PaymentMethodId
) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (paymentMethod === "COD") return { error: "Services are prepaid only." };

  const pkg = await prisma.servicePackage.findUnique({ where: { id: packageId }, include: { product: { include: { seller: true } } } });
  if (!pkg || pkg.product.status !== "ACTIVE" || pkg.product.kind !== "SERVICE") return { error: "This service isn't available right now." };
  if (pkg.product.seller.userId === session.user.id) return { error: "You can't order your own service." };

  const order = await createOrder({
    buyerId: session.user.id,
    sellerId: pkg.product.sellerId,
    items: [{
      productId: pkg.product.id,
      title: `${pkg.product.title} (${pkg.tier})`,
      imageUrl: (pkg.product.images as string[])[0] ?? "",
      unitPrice: pkg.price,
      quantity: 1,
      sourceType: "BUY_NOW",
    }],
    shipping: { name: shipping.name, phone: shipping.phone, address: "Online service, no shipping address", city: "—", province: "—", postalCode: "—" },
    paymentMethod,
    fulfillmentMethod: "SERVICE",
    buyerProtectionOptIn: false,
  });

  await prisma.serviceOrder.create({
    data: {
      orderId: order.id,
      packageId: pkg.id,
      packageTier: pkg.tier,
      deliveryDays: pkg.deliveryDays,
      revisionsIncluded: pkg.revisionsIncluded,
      status: "AWAITING_BRIEF",
    },
  });

  return { success: true, orderId: order.id };
}

async function getOwnedServiceOrder(orderId: string, userId: string, role: "buyer" | "seller") {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { serviceOrder: true, seller: true } });
  if (!order || !order.serviceOrder) return null;
  if (role === "buyer" && order.buyerId !== userId) return null;
  if (role === "seller" && order.seller.userId !== userId) return null;
  return order;
}

export async function submitServiceRequirementsAction(orderId: string, brief: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (!brief.trim()) return { error: "Tell the seller what you need." };

  const order = await getOwnedServiceOrder(orderId, session.user.id, "buyer");
  if (!order?.serviceOrder) return { error: "Order not found." };
  if (order.serviceOrder.status !== "AWAITING_BRIEF") return { error: "This order's requirements were already submitted." };

  const dueAt = new Date(Date.now() + order.serviceOrder.deliveryDays * 86400000);
  await prisma.serviceOrder.update({ where: { id: order.serviceOrder.id }, data: { requirementsBrief: brief, status: "IN_PROGRESS", dueAt } });
  await notify(order.seller.userId, "ORDER_CONFIRMED", "Requirements received", `The buyer submitted requirements for ${order.orderNumber}. You're due in ${order.serviceOrder.deliveryDays} day(s).`, "/studio/orders");

  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}

export async function deliverServiceAction(orderId: string, fileUrls: string[], message: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (fileUrls.length === 0 && !message.trim()) return { error: "Attach a file or write a delivery message." };

  const order = await getOwnedServiceOrder(orderId, session.user.id, "seller");
  if (!order?.serviceOrder) return { error: "Order not found." };
  if (!["IN_PROGRESS", "REVISION_REQUESTED"].includes(order.serviceOrder.status)) {
    return { error: "This order isn't ready to be delivered yet." };
  }

  const now = new Date();
  const autoConfirmAt = new Date(now.getTime() + SERVICE_AUTO_CONFIRM_DAYS * 86400000);
  await prisma.$transaction([
    prisma.serviceDelivery.create({ data: { serviceOrderId: order.serviceOrder.id, fileUrls, message: message || null } }),
    prisma.serviceOrder.update({ where: { id: order.serviceOrder.id }, data: { status: "DELIVERED", deliveredAt: now, autoConfirmAt } }),
  ]);
  await updateOrderStatus(orderId, "DELIVERED");
  if (order.buyerId) {
    await notify(order.buyerId, "ORDER_DELIVERED", "Your order was delivered", `${order.orderNumber} has been delivered. Review it within ${SERVICE_AUTO_CONFIRM_DAYS} days or it auto-completes.`, `/orders/${orderId}`);
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/studio/orders");
  return { success: true };
}

export async function requestServiceRevisionAction(orderId: string, notes: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const order = await getOwnedServiceOrder(orderId, session.user.id, "buyer");
  if (!order?.serviceOrder) return { error: "Order not found." };
  const so = order.serviceOrder;
  if (so.status !== "DELIVERED") return { error: "This order isn't awaiting your review." };
  if (so.revisionsUsed >= so.revisionsIncluded) {
    return { error: "You've used all included revisions for this package. You can still accept the delivery or report a problem." };
  }

  await prisma.serviceOrder.update({ where: { id: so.id }, data: { status: "REVISION_REQUESTED", revisionsUsed: so.revisionsUsed + 1 } });
  await prisma.order.update({ where: { id: orderId }, data: { status: "PROCESSING" } });
  await notify(order.seller.userId, "REMINDER", "Revision requested", `${order.orderNumber}: ${notes.trim() || "The buyer asked for a revision."}`, "/studio/orders");

  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}

/** The buyer's own acceptance — the primary way a service order closes out
 * early instead of waiting for the auto-confirm window (see
 * SERVICE_AUTO_CONFIRM_DAYS in lib/services/service-orders.ts). */
export async function acceptServiceDeliveryAction(orderId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const order = await getOwnedServiceOrder(orderId, session.user.id, "buyer");
  if (!order?.serviceOrder) return { error: "Order not found." };
  if (order.serviceOrder.status !== "DELIVERED") return { error: "This order isn't awaiting your review." };

  await prisma.serviceOrder.update({ where: { id: order.serviceOrder.id }, data: { status: "COMPLETED", buyerConfirmedAt: new Date() } });
  await updateOrderStatus(orderId, "COMPLETED");
  await notify(order.seller.userId, "PAYMENT_RECEIVED", "Order accepted", `${order.orderNumber} was accepted, and funds are now available for payout.`, "/studio/payouts");

  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}
