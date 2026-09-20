import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createOrder, type ShippingInfo } from "@/lib/services/orders";
import { reserveInventory } from "@/lib/services/inventory";
import { sendEmail } from "@/lib/services/email";
import type { PaymentMethodId } from "@/lib/payments/provider";

// COD requires a courier that actually collects and remits cash to ATBP —
// there's no one to vouch for a guest's identity or reachability the way a
// registered account (or, eventually, a verified phone) does, so it's
// blocked outright regardless of whether a COD-capable shipping provider is
// active yet. This is the guardrail from the guest-checkout spec, wired now
// so it's already enforced the moment COD itself turns on.
export const GUEST_BLOCKED_PAYMENT_METHODS: ReadonlySet<PaymentMethodId> = new Set(["COD"]);

const TRACKING_TOKEN_TTL_MS = 30 * 24 * 60 * 60_000; // 30 days — long enough to cover the return/dispute window

export interface GuestCheckoutInput {
  productId: string;
  quantity: number;
  email: string;
  phone: string;
  shipping: ShippingInfo;
  paymentMethod: PaymentMethodId;
  shippingProviderId?: string;
  buyerProtectionOptIn?: boolean;
}

export interface GuestCheckoutResult {
  orderId: string;
  orderNumber: string;
  trackingUrl: string;
  emailSent: boolean;
}

function trackingUrlFor(token: string) {
  return `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/orders/track?token=${token}`;
}

async function sendGuestOrderConfirmation(email: string, orderNumber: string, trackingUrl: string) {
  return sendEmail(
    email,
    `Your ATBP order ${orderNumber} is confirmed`,
    `Thanks for your order! Track it, message the seller, or open a return/dispute anytime using this link, no account needed:\n\n${trackingUrl}\n\nThis link is personal to your order, so don't share it.`
  );
}

/** The full guest checkout path: single product, single seller, prepaid only.
 * Deliberately narrower than the account-holder checkout in
 * lib/actions/orders.ts (no cart, no multi-seller bundling, no promo/coupon,
 * SHIP or DIGITAL fulfillment only) — see the scope note in
 * lib/actions/guest-checkout.ts for why. */
export async function createGuestOrder(input: GuestCheckoutInput): Promise<GuestCheckoutResult | { error: string }> {
  const email = input.email.trim().toLowerCase();

  if (GUEST_BLOCKED_PAYMENT_METHODS.has(input.paymentMethod)) {
    return { error: "Cash on Delivery isn't available for guest checkout. Please sign in or create an account to use COD." };
  }

  // Email-first detection: this email already has an account — never create a
  // second, disconnected guest identity for the same person.
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "An account already exists with this email. Please log in to check out." };
  }

  const product = await prisma.product.findUnique({ where: { id: input.productId }, include: { seller: true } });
  if (!product || product.status !== "ACTIVE") return { error: "This item is no longer available." };
  if (product.listingType === "AUCTION") return { error: "Auction items can't be bought directly. Place a bid instead." };
  if (!product.isDigital && !product.shippingAvailable) {
    return { error: "This item isn't available for guest checkout. Please sign in to see pickup/local delivery options." };
  }

  const ok = await reserveInventory(product.id, input.quantity);
  if (!ok) return { error: "Sorry, this item just sold out." };

  const unitPrice = product.dealPrice ?? product.price;
  const order = await createOrder({
    buyerId: null,
    guestEmail: email,
    guestPhone: input.phone.trim(),
    sellerId: product.sellerId,
    items: [{
      productId: product.id,
      title: product.title,
      imageUrl: (product.images as string[])[0],
      unitPrice,
      quantity: input.quantity,
      sourceType: "BUY_NOW",
    }],
    shipping: input.shipping,
    paymentMethod: input.paymentMethod,
    fulfillmentMethod: product.isDigital ? "DIGITAL" : "SHIP",
    shippingProviderId: input.shippingProviderId,
    buyerProtectionOptIn: input.buyerProtectionOptIn,
  });

  const token = randomBytes(32).toString("hex");
  await prisma.order.update({
    where: { id: order.id },
    data: { guestTrackingToken: token, guestTrackingTokenExpiresAt: new Date(Date.now() + TRACKING_TOKEN_TTL_MS) },
  });

  const trackingUrl = trackingUrlFor(token);
  const emailResult = await sendGuestOrderConfirmation(email, order.orderNumber, trackingUrl);

  return { orderId: order.id, orderNumber: order.orderNumber, trackingUrl, emailSent: emailResult.sent };
}

export async function getOrderByTrackingToken(token: string) {
  if (!token) return null;
  const order = await prisma.order.findUnique({
    where: { guestTrackingToken: token },
    include: { items: true, seller: true, shipment: true, dispute: true, review: true },
  });
  if (!order) return null;
  if (!order.guestTrackingTokenExpiresAt || order.guestTrackingTokenExpiresAt < new Date()) return null;
  return order;
}

/** Called at signup — folds any past guest orders placed with this email into
 * the new account, so a converted guest doesn't lose their order history.
 * Login doesn't need this: an existing account's guest orders would already
 * have been caught by the email-first check in createGuestOrder above, so
 * there's nothing left unclaimed by the time someone can log in with that email. */
export async function claimGuestOrders(userId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  await prisma.order.updateMany({
    where: { buyerId: null, guestEmail: normalizedEmail },
    data: { buyerId: userId },
  });
}

async function uniqueUsernameFrom(base: string) {
  const slug = base.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15) || "user";
  let candidate = slug;
  let i = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    i++;
    candidate = `${slug}${i}`;
  }
  return candidate;
}

/** The post-purchase "Create an account to track your orders" nudge — one
 * field (password) rather than a full signup form, since we already have
 * their name/email from the order they just placed. Auto-generates a
 * username the same way OAuth signup does (see lib/auth.ts), so this is
 * genuinely one tap. Claims their just-placed (and any other past) guest
 * orders under the new account. */
export async function createAccountFromGuest(email: string, name: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { error: "An account with this email already exists. Please log in instead." };

  const username = await uniqueUsernameFrom(name || normalizedEmail.split("@")[0]);
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash, name: name || username, username, role: "BUYER" },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  await claimGuestOrders(user.id, normalizedEmail);

  return { success: true as const, userId: user.id };
}
