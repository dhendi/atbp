"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { logProductEvent } from "@/lib/trending";
import { genOrderNumber } from "@/lib/utils";
import { getPaymentProvider, isClientPaymentMethod, type PaymentMethodId } from "@/lib/payments/provider";
import { recordCommission } from "@/lib/services/commission";
import { bidAmountSchema, shippingInfoSchema, firstIssue } from "@/lib/validation";

// Anti-sniping: a bid landing inside this window of the scheduled end pushes
// the end time back, so an auction can't be won by a bid placed in the final
// second. Real eBay-style behavior, and a good fit for "Rapid Auctions" too.
const SNIPE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const SNIPE_EXTENSION_MS = 2 * 60 * 1000; // 2 minutes

// A simple per-user-per-auction cooldown — not a full rate limiter, just
// enough to stop a script (or a fat-fingered double click) from hammering
// the bid endpoint faster than a human plausibly bids.
const BID_COOLDOWN_MS = 1500;

/** Ends any auctions whose end time has passed, computing a winner if the reserve (if any) was met. Safe to call often — it's a no-op once an auction is already settled. */
export async function settleExpiredAuctions() {
  const expired = await prisma.productAuction.findMany({
    where: { status: "ACTIVE", endAt: { lte: new Date() } },
    include: { product: { include: { seller: true } }, bids: { orderBy: { amount: "desc" }, take: 1 } },
  });

  for (const auction of expired) {
    const topBid = auction.bids[0];
    const reserveMet = !auction.reservePrice || (!!topBid && topBid.amount >= auction.reservePrice);
    const winnerUserId = topBid && reserveMet ? topBid.userId : null;

    await prisma.productAuction.update({
      where: { id: auction.id },
      data: { status: "ENDED", winnerUserId, winningBidId: winnerUserId ? topBid!.id : null, reserveMet },
    });

    if (winnerUserId) {
      await notify(
        winnerUserId,
        "AUCTION_WON",
        "You won an auction! 🔨",
        `Your bid on "${auction.product.title}" won. Complete your purchase before it's released back to the marketplace.`,
        `/bids`
      );
      await notify(
        auction.product.seller.userId,
        "AUCTION_ENDED",
        "Your auction ended with a winner",
        `"${auction.product.title}" sold for ${topBid!.amount} to the winning bidder.`,
        `/studio/auctions`
      );
    } else if (topBid) {
      await notify(
        auction.product.seller.userId,
        "AUCTION_ENDED",
        "Auction ended: reserve not met",
        `"${auction.product.title}" ended without meeting your reserve price.`,
        `/studio/auctions`
      );
    } else {
      await notify(
        auction.product.seller.userId,
        "AUCTION_ENDED",
        "Auction ended with no bids",
        `"${auction.product.title}" closed without any bids.`,
        `/studio/auctions`
      );
    }
  }

  return expired.length;
}

/** Notifies anyone who saved a scheduled auction once its start time passes and bidding opens. Safe to call often — `startNotifiedAt` makes it a no-op after the first run per auction. */
export async function notifyStartedAuctions() {
  const justOpened = await prisma.productAuction.findMany({
    where: { status: "ACTIVE", startAt: { lte: new Date() }, startNotifiedAt: null },
    include: { product: true },
  });

  for (const auction of justOpened) {
    const watchers = await prisma.savedProduct.findMany({ where: { productId: auction.productId } });
    for (const watcher of watchers) {
      await notify(
        watcher.userId,
        "AUCTION_STARTING",
        "Bidding just opened! 🔨",
        `An auction you saved ("${auction.product.title}") is now open for bids.`,
        `/product/${auction.productId}`
      );
    }
    await prisma.productAuction.update({ where: { id: auction.id }, data: { startNotifiedAt: new Date() } });
  }

  return justOpened.length;
}

const ENDING_SOON_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Notifies anyone who saved an auction once it's within an hour of ending —
 * the "auction ending" wishlist alert. Safe to call often: `endingSoonNotifiedAt`
 * makes it a no-op after the first run per auction, same pattern as notifyStartedAuctions. */
export async function notifyEndingSoonAuctions() {
  const now = new Date();
  const soon = new Date(now.getTime() + ENDING_SOON_WINDOW_MS);
  const endingSoon = await prisma.productAuction.findMany({
    where: { status: "ACTIVE", startAt: { lte: now }, endAt: { lte: soon }, endingSoonNotifiedAt: null },
    include: { product: true },
  });

  for (const auction of endingSoon) {
    const watchers = await prisma.savedProduct.findMany({ where: { productId: auction.productId } });
    for (const watcher of watchers) {
      await notify(
        watcher.userId,
        "AUCTION_ENDING",
        "Ending soon: place your bid! ⏰",
        `An auction you saved ("${auction.product.title}") ends within the hour.`,
        `/product/${auction.productId}`
      );
    }
    await prisma.productAuction.update({ where: { id: auction.id }, data: { endingSoonNotifiedAt: new Date() } });
  }

  return endingSoon.length;
}

export async function placeBidAction(productId: string, amount: number) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const amountResult = bidAmountSchema.safeParse(amount);
  if (!amountResult.success) return { error: firstIssue(amountResult) };
  amount = amountResult.data;

  await settleExpiredAuctions();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { seller: true, auction: true },
  });
  if (!product || !product.auction) return { error: "This auction no longer exists." };
  if (product.seller.userId === session.user.id) return { error: "You can't bid on your own listing." };

  const auction = product.auction;
  if (auction.status !== "ACTIVE") return { error: "This auction has already ended." };
  if (new Date(auction.endAt) <= new Date()) return { error: "This auction has already ended." };
  if (new Date(auction.startAt) > new Date()) return { error: "This auction hasn't started yet." };

  const minNextBid = auction.bidCount === 0 ? auction.startingBid : auction.currentBid + auction.minIncrement;
  if (amount < minNextBid) {
    return { error: `Your bid must be at least ${minNextBid}.` };
  }

  const recentOwnBid = await prisma.productBid.findFirst({
    where: { auctionId: auction.id, userId: session.user.id, createdAt: { gte: new Date(Date.now() - BID_COOLDOWN_MS) } },
  });
  if (recentOwnBid) return { error: "Please wait a moment before bidding again." };

  const previousTopBid = auction.bidCount > 0
    ? await prisma.productBid.findFirst({ where: { auctionId: auction.id }, orderBy: { amount: "desc" } })
    : null;

  // Anti-sniping: a bid landing near the scheduled close pushes endAt back,
  // so the highest bidder can never win purely by timing a bid to the wire.
  const msRemaining = new Date(auction.endAt).getTime() - Date.now();
  const extended = msRemaining <= SNIPE_WINDOW_MS;
  const newEndAt = extended ? new Date(Date.now() + SNIPE_EXTENSION_MS) : auction.endAt;

  // The read above (auction.currentBid/bidCount) is stale by the time this
  // commits if another bid lands concurrently — a plain update here would let
  // a slower-committing transaction silently overwrite a higher concurrent
  // bid's currentBid/bidCount. Guard the update with `currentBid: { lt: amount },
  // bidCount: auction.bidCount` (both must still match what was just read) so
  // Postgres only applies it if nothing raced past it; a 0-row result means a
  // concurrent bid won the race, and this one is rolled back and rejected
  // outright rather than recording a bid against now-stale state. Both
  // statements share one transaction so a race is never left half-applied
  // (auction updated but no matching bid row, or vice versa).
  let updatedAuction: Awaited<ReturnType<typeof prisma.productAuction.findUniqueOrThrow>> | null = null;
  try {
    updatedAuction = await prisma.$transaction(async (tx) => {
      const updated = await tx.productAuction.updateMany({
        where: { id: auction.id, currentBid: { lt: amount }, bidCount: auction.bidCount },
        data: {
          currentBid: amount,
          bidCount: { increment: 1 },
          endAt: newEndAt,
          extensionCount: extended ? { increment: 1 } : undefined,
        },
      });
      if (updated.count === 0) throw new Error("OUTBID_RACE");
      await tx.productBid.create({ data: { auctionId: auction.id, userId: session.user.id, amount } });
      return tx.productAuction.findUniqueOrThrow({ where: { id: auction.id } });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "OUTBID_RACE") {
      return { error: "Someone just placed a higher bid. Please refresh and try again." };
    }
    throw err;
  }

  await logProductEvent(productId, "BID", session.user.id);

  if (previousTopBid && previousTopBid.userId !== session.user.id) {
    await notify(
      previousTopBid.userId,
      "OUTBID",
      "You've been outbid",
      `Someone placed a higher bid on "${product.title}". The current bid is now ${amount}.`,
      `/product/${productId}`
    );
  }

  revalidatePath(`/product/${productId}`);
  revalidatePath("/auctions");
  revalidatePath("/bids");

  return {
    success: true,
    currentBid: updatedAuction.currentBid,
    bidCount: updatedAuction.bidCount,
    minNextBid: updatedAuction.currentBid + updatedAuction.minIncrement,
    endAt: updatedAuction.endAt.toISOString(),
    extended,
  };
}

/** Pay the seller's fixed Buy It Now price to end the auction immediately and win it outright. */
export async function buyNowAuctionAction(productId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  await settleExpiredAuctions();

  const product = await prisma.product.findUnique({ where: { id: productId }, include: { seller: true, auction: true } });
  if (!product || !product.auction) return { error: "This auction no longer exists." };
  if (product.seller.userId === session.user.id) return { error: "You can't buy your own listing." };

  const auction = product.auction;
  if (auction.status !== "ACTIVE") return { error: "This auction has already ended." };
  if (new Date(auction.startAt) > new Date()) return { error: "This auction hasn't started yet." };
  if (!auction.buyNowPrice) return { error: "Buy It Now isn't available for this auction." };

  // Guard against two simultaneous Buy It Now clicks on the same one-of-a-kind
  // item — without the `status: "ACTIVE"` condition, both requests would read
  // ACTIVE, and whichever update commits last would silently overwrite the
  // other's winnerUserId, leaving the first buyer's "you won" response
  // pointing at an auction someone else is now recorded as having won.
  const claimed = await prisma.productAuction.updateMany({
    where: { id: auction.id, status: "ACTIVE" },
    data: {
      status: "ENDED",
      currentBid: auction.buyNowPrice,
      bidCount: { increment: 1 },
      winnerUserId: session.user.id,
      reserveMet: true,
    },
  });
  if (claimed.count === 0) {
    return { error: "This item was just bought by someone else." };
  }
  await prisma.productBid.create({ data: { auctionId: auction.id, userId: session.user.id, amount: auction.buyNowPrice } });
  await logProductEvent(productId, "BID", session.user.id);

  await notify(product.seller.userId, "AUCTION_ENDED", "Sold via Buy It Now", `"${product.title}" was just bought outright for ${auction.buyNowPrice}.`, "/studio/auctions");

  revalidatePath(`/product/${productId}`);
  revalidatePath("/auctions");
  revalidatePath("/bids");
  return { success: true };
}

export async function completeAuctionPurchaseAction(
  productId: string,
  shipping: { name: string; phone: string; address: string; city: string; province: string; postalCode: string },
  paymentMethod: PaymentMethodId
) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (!session.user.hasVerifiedEmail) {
    return { error: "Please verify your email before checking out. Use the banner at the top of the page." };
  }
  if (!isClientPaymentMethod(paymentMethod) || paymentMethod === "COD") return { error: "Choose a valid payment method." };

  const shippingResult = shippingInfoSchema.safeParse(shipping);
  if (!shippingResult.success) return { error: firstIssue(shippingResult) };
  shipping = shippingResult.data;

  await settleExpiredAuctions();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { seller: true, auction: true },
  });
  if (!product || !product.auction) return { error: "Auction not found." };
  const auction = product.auction;

  if (auction.status !== "ENDED") return { error: "This auction hasn't ended yet." };
  if (auction.winnerUserId !== session.user.id) return { error: "Only the winning bidder can complete this purchase." };
  if (product.quantityAvailable <= 0 || product.status === "SOLD_OUT") return { error: "This item is no longer available." };

  // Claim the purchase atomically before doing anything else — same guarded
  // `updateMany` pattern as buyNowAuctionAction. Without this, a double-click
  // or retried request could both pass the earlier `purchasedAt` read (it's
  // only written at the very end, after order creation, commission, and a
  // payment-provider call) and create two orders for the same one-of-one item.
  const claimed = await prisma.productAuction.updateMany({
    where: { id: auction.id, purchasedAt: null },
    data: { purchasedAt: new Date() },
  });
  if (claimed.count === 0) return { error: "This item has already been purchased." };

  const amount = auction.currentBid;
  const shippingFee = 90;
  const total = amount + shippingFee;

  const order = await prisma.order.create({
    data: {
      orderNumber: genOrderNumber(),
      buyerId: session.user.id,
      sellerId: product.sellerId,
      subtotal: amount,
      shippingFee,
      total,
      status: "PROCESSING",
      paymentMethod,
      paymentStatus: "PENDING",
      shippingName: shipping.name,
      shippingPhone: shipping.phone,
      shippingAddress: shipping.address,
      shippingCity: shipping.city,
      shippingProvince: shipping.province,
      shippingPostalCode: shipping.postalCode,
      items: {
        create: [{
          productId: product.id,
          title: product.title,
          imageUrl: (product.images as string[])[0],
          unitPrice: amount,
          quantity: 1,
          sourceType: "AUCTION",
        }],
      },
    },
  });

  // An auction sale is still a sale — same commission + processing-fee rules
  // as a regular checkout apply, just on the winning bid amount.
  await recordCommission(order.id, product.sellerId, amount, paymentMethod);

  const provider = getPaymentProvider(paymentMethod);
  const result = await provider.createAndConfirm(total, order.id);
  await prisma.payment.create({
    data: { orderId: order.id, provider: paymentMethod, status: result.status, amount: total, providerRef: result.providerRef },
  });
  if (result.status === "SUCCEEDED") {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } });
  }

  // An auction item is one-of-one by construction — sold out the instant it's paid for.
  // (purchasedAt was already claimed atomically above.)
  await prisma.product.update({ where: { id: product.id }, data: { quantityAvailable: 0, status: "SOLD_OUT" } });
  await logProductEvent(productId, "PURCHASE", session.user.id);

  await notify(product.seller.userId, "ORDER_CONFIRMED", "Auction item sold", `${order.orderNumber}: the winning bidder completed checkout for "${product.title}".`, `/studio/orders`);

  revalidatePath("/bids");
  revalidatePath("/orders");
  return { success: true, orderId: order.id };
}

/** Ends an auction early. If it already has bids, it's settled exactly like a natural expiry (highest bid wins, subject to reserve); with no bids yet it's simply cancelled. */
export async function cancelAuctionAction(productId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "Not authorized." };

  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId: seller.id },
    include: { auction: { include: { bids: { orderBy: { amount: "desc" }, take: 1 } } } },
  });
  if (!product?.auction) return { error: "Auction not found." };
  if (product.auction.status !== "ACTIVE") return { error: "This auction has already ended." };

  const auction = product.auction;
  const topBid = auction.bids[0];

  if (!topBid) {
    await prisma.productAuction.update({ where: { id: auction.id }, data: { status: "CANCELLED" } });
    revalidatePath("/studio/auctions");
    revalidatePath(`/product/${productId}`);
    return { success: true };
  }

  const reserveMet = !auction.reservePrice || topBid.amount >= auction.reservePrice;
  const winnerUserId = reserveMet ? topBid.userId : null;

  await prisma.productAuction.update({
    where: { id: auction.id },
    data: { status: "ENDED", winnerUserId, winningBidId: winnerUserId ? topBid.id : null, reserveMet, endAt: new Date() },
  });

  if (winnerUserId) {
    await notify(winnerUserId, "AUCTION_WON", "You won an auction! 🔨", `The seller ended "${product.title}" early with you as the highest bidder. Complete your purchase from My Bids.`, "/bids");
  }

  revalidatePath("/studio/auctions");
  revalidatePath(`/product/${productId}`);
  revalidatePath("/bids");
  return { success: true };
}
