import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { reserveInventory, releaseInventory } from "@/lib/services/inventory";
import { effectivePrice } from "@/lib/deals";

export const TAWAD_MAX_OFFERS_PER_BUYER = 3;
export const TAWAD_OFFER_EXPIRY_HOURS = 48;
export const TAWAD_PAYMENT_WINDOW_HOURS = 24;

export interface LimitCheck {
  allowed: boolean;
  error?: string;
}

/** Tawad only exists on casual (Closet/Yard Sale) listings — never on a
 * BIR-verified My Shop product, which has neither closetId nor yardSaleId set. */
export function isTawadEligibleListing(product: { closetId: string | null; yardSaleId: string | null }): boolean {
  return !!product.closetId || !!product.yardSaleId;
}

export async function assertCanSubmitOffer(productId: string, buyerId: string): Promise<LimitCheck> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { allowed: false, error: "Listing not found." };
  if (!isTawadEligibleListing(product)) return { allowed: false, error: "This listing doesn't accept offers." };
  if (!product.tawadEnabled) return { allowed: false, error: "This seller isn't accepting offers on this item." };
  if (product.status !== "ACTIVE") return { allowed: false, error: "This item is no longer available." };
  if (product.sellerId === buyerId) return { allowed: false, error: "You can't make an offer on your own listing." };

  const priorCount = await prisma.offer.count({ where: { productId, buyerId } });
  if (priorCount >= TAWAD_MAX_OFFERS_PER_BUYER) {
    return { allowed: false, error: `You've reached the limit of ${TAWAD_MAX_OFFERS_PER_BUYER} offers on this item.` };
  }
  // A still-open thread (pending or countered) must be resolved before a new one starts.
  const openOffer = await prisma.offer.findFirst({ where: { productId, buyerId, status: { in: ["PENDING", "COUNTERED"] } } });
  if (openOffer) return { allowed: false, error: "You already have an open offer on this item." };

  return { allowed: true };
}

/** Reserves the item for the buyer at the agreed price via a normal BUY_NOW
 * cart item — reusing checkout, commission, and buyer-protection-fee math
 * unchanged, since they all key off CartItem.unitPrice, not Product.price. */
async function reserveForAcceptedOffer(offerId: string, agreedPrice: number) {
  const offer = await prisma.offer.findUniqueOrThrow({ where: { id: offerId }, include: { product: true } });
  const ok = await reserveInventory(offer.productId, 1);
  if (!ok) return { success: false as const, error: "This item just sold out." };

  const cart = await prisma.cart.upsert({ where: { userId: offer.buyerId }, update: {}, create: { userId: offer.buyerId } });
  await prisma.cartItem.create({
    data: {
      cartId: cart.id, productId: offer.productId, quantity: 1,
      unitPrice: agreedPrice, sourceType: "BUY_NOW",
    },
  });

  const reservedUntil = new Date(Date.now() + TAWAD_PAYMENT_WINDOW_HOURS * 3600000);
  await prisma.offer.update({
    where: { id: offerId },
    data: { status: "ACCEPTED", agreedPrice, reservedUntil, expiresAt: null },
  });
  return { success: true as const, reservedUntil };
}

export async function submitOffer(buyerId: string, productId: string, amount: number) {
  const check = await assertCanSubmitOffer(productId, buyerId);
  if (!check.allowed) return { error: check.error! };

  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const listedPrice = effectivePrice(product);
  if (amount <= 0) return { error: "Enter a valid offer amount." };
  if (amount >= listedPrice) return { error: "That's at or above the listed price. Buy it now instead of making an offer." };

  const priorCount = await prisma.offer.count({ where: { productId, buyerId } });
  const reofferCount = priorCount + 1;

  // Below the seller's hidden floor — auto-decline, never reveal the floor itself.
  if (product.tawadFloor != null && amount < product.tawadFloor) {
    const offer = await prisma.offer.create({
      data: { productId, buyerId, sellerId: product.sellerId, amount, reofferCount, status: "AUTO_DECLINED" },
    });
    return { success: true, outcome: "AUTO_DECLINED" as const, offer };
  }

  // At/above the optional ceiling — auto-accept immediately.
  if (product.tawadCeiling != null && amount >= product.tawadCeiling) {
    const offer = await prisma.offer.create({
      data: { productId, buyerId, sellerId: product.sellerId, amount, reofferCount, status: "PENDING" },
    });
    const result = await reserveForAcceptedOffer(offer.id, amount);
    if (!result.success) return { error: result.error };
    const seller = await prisma.sellerProfile.findUniqueOrThrow({ where: { id: product.sellerId } });
    await notify(seller.userId, "OFFER_ACCEPTED", "Tawad auto-accepted", `An offer of ₱${amount} on "${product.title}" met your auto-accept price and was accepted automatically.`, "/studio/tawad");
    await notify(buyerId, "OFFER_ACCEPTED", "Your Tawad was accepted!", `Your offer of ₱${amount} on "${product.title}" was accepted. You have ${TAWAD_PAYMENT_WINDOW_HOURS} hours to complete checkout.`, "/offers");
    return { success: true, outcome: "AUTO_ACCEPTED" as const, offer };
  }

  // Otherwise it's a real offer for the seller to review.
  const expiresAt = new Date(Date.now() + TAWAD_OFFER_EXPIRY_HOURS * 3600000);
  const offer = await prisma.offer.create({
    data: { productId, buyerId, sellerId: product.sellerId, amount, reofferCount, status: "PENDING", expiresAt },
  });
  const seller = await prisma.sellerProfile.findUniqueOrThrow({ where: { id: product.sellerId } });
  await notify(seller.userId, "OFFER_RECEIVED", "New Tawad offer", `Someone offered ₱${amount} on "${product.title}".`, "/studio/tawad");
  return { success: true, outcome: "PENDING" as const, offer };
}

export async function respondToOffer(sellerId: string, offerId: string, action: "ACCEPT" | "DECLINE" | "COUNTER", counterAmount?: number) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { product: true } });
  if (!offer) return { error: "Offer not found." };
  if (offer.sellerId !== sellerId) return { error: "Not authorized." };
  if (offer.status !== "PENDING") return { error: "This offer has already been resolved." };

  if (action === "ACCEPT") {
    const result = await reserveForAcceptedOffer(offer.id, offer.amount);
    if (!result.success) return { error: result.error };
    await notify(offer.buyerId, "OFFER_ACCEPTED", "Your Tawad was accepted!", `Your offer of ₱${offer.amount} on "${offer.product.title}" was accepted. You have ${TAWAD_PAYMENT_WINDOW_HOURS} hours to complete checkout.`, "/offers");
    return { success: true };
  }

  if (action === "DECLINE") {
    await prisma.offer.update({ where: { id: offerId }, data: { status: "DECLINED" } });
    await notify(offer.buyerId, "OFFER_DECLINED", "Tawad declined", `Your offer on "${offer.product.title}" was declined.`, "/offers");
    return { success: true };
  }

  // COUNTER
  if (!counterAmount || counterAmount <= 0) return { error: "Enter a valid counter amount." };
  const listedPrice = effectivePrice(offer.product);
  if (counterAmount >= listedPrice) return { error: "A counter at or above the listed price doesn't make sense. Decline instead and point them to Buy Now." };
  const expiresAt = new Date(Date.now() + TAWAD_OFFER_EXPIRY_HOURS * 3600000);
  await prisma.offer.update({ where: { id: offerId }, data: { status: "COUNTERED", counterAmount, expiresAt } });
  await notify(offer.buyerId, "OFFER_COUNTERED", "Seller countered your Tawad", `The seller countered your offer on "${offer.product.title}" with ₱${counterAmount}.`, "/offers");
  return { success: true };
}

export async function respondToCounter(buyerId: string, offerId: string, action: "ACCEPT" | "DECLINE") {
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { product: true } });
  if (!offer) return { error: "Offer not found." };
  if (offer.buyerId !== buyerId) return { error: "Not authorized." };
  if (offer.status !== "COUNTERED" || offer.counterAmount == null) return { error: "There's no counter to respond to." };

  const seller = await prisma.sellerProfile.findUniqueOrThrow({ where: { id: offer.sellerId } });

  if (action === "ACCEPT") {
    const result = await reserveForAcceptedOffer(offer.id, offer.counterAmount);
    if (!result.success) return { error: result.error };
    await notify(seller.userId, "OFFER_ACCEPTED", "Tawad counter accepted", `Your counter of ₱${offer.counterAmount} on "${offer.product.title}" was accepted.`, "/studio/tawad");
    return { success: true };
  }

  await prisma.offer.update({ where: { id: offerId }, data: { status: "DECLINED" } });
  await notify(seller.userId, "OFFER_DECLINED", "Tawad counter declined", `Your counter on "${offer.product.title}" was declined.`, "/studio/tawad");
  return { success: true };
}

/** Also called from the daily maintenance cron (see api/cron/maintenance) as
 * a backstop — still called opportunistically from high-traffic read paths
 * too (product page, /offers, /studio/tawad), since the cron is Hobby-plan-
 * limited to once a day, too infrequent on its own. Idempotent and cheap
 * when nothing is actually overdue. */
export async function expireStaleOffers() {
  const now = new Date();

  const overdueOpen = await prisma.offer.findMany({
    where: { status: { in: ["PENDING", "COUNTERED"] }, expiresAt: { lt: now } },
    include: { product: true },
  });
  for (const offer of overdueOpen) {
    await prisma.offer.update({ where: { id: offer.id }, data: { status: "EXPIRED" } });
    // Whoever's turn it was to act (seller on a fresh offer, buyer on a
    // counter) is the one who let it lapse — notify the other side either way,
    // since expiry closes the thread for both of them.
    await notify(offer.buyerId, "OFFER_EXPIRED", "Tawad offer expired", `Your offer on "${offer.product.title}" expired without a response.`, "/offers");
  }

  const lapsedAccepted = await prisma.offer.findMany({
    where: { status: "ACCEPTED", reservedUntil: { lt: now }, orderId: null },
    include: { product: true },
  });
  for (const offer of lapsedAccepted) {
    await prisma.offer.update({ where: { id: offer.id }, data: { status: "LAPSED" } });
    await releaseInventory(offer.productId, 1);
    // The BUY_NOW cart item reserved at acceptance never became an order — it
    // has no other purpose once lapsed, and leaving it would show a dead item
    // sitting in the buyer's cart with a price no longer honored.
    await prisma.cartItem.deleteMany({ where: { productId: offer.productId, sourceType: "BUY_NOW", cart: { userId: offer.buyerId } } });
    const seller = await prisma.sellerProfile.findUnique({ where: { id: offer.sellerId } });
    if (seller) {
      await notify(seller.userId, "OFFER_DECLINED", "Tawad reservation lapsed", `The accepted offer on "${offer.product.title}" lapsed unpaid, and it's back up for sale.`, "/studio/tawad");
    }
  }

  return overdueOpen.length + lapsedAccepted.length;
}
