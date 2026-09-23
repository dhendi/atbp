import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { reserveInventory } from "@/lib/services/inventory";
import { createOrder } from "@/lib/services/orders";

export interface BidResult {
  success: boolean;
  message: string;
  currentBid?: number;
}

/**
 * Auctions have no background worker — they are finalized lazily, the moment
 * anyone reads or bids on them past `endsAt`. This keeps the demo simple while
 * staying correct: whichever request first notices the auction has expired
 * performs the one-time SOLD transition and order creation.
 */
export async function finalizeIfExpired(auctionId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      bids: { orderBy: { amount: "desc" }, take: 1 },
      livestreamProduct: { include: { product: { include: { seller: true } } } },
    },
  });
  if (!auction) return null;
  if (auction.status !== "RUNNING" || auction.endsAt > new Date()) return auction;

  const topBid = auction.bids[0];
  const updated = await prisma.auction.update({
    where: { id: auction.id },
    data: {
      status: "ENDED",
      winnerUserId: topBid?.userId ?? null,
      winningBid: topBid?.amount ?? null,
    },
  });

  await prisma.livestreamProduct.update({
    where: { id: auction.livestreamProductId },
    data: { status: "ENDED", endedAt: new Date() },
  });

  if (topBid) {
    const product = auction.livestreamProduct.product;
    const reserved = await reserveInventory(product.id, 1);
    if (reserved) {
      const order = await createOrder({
        buyerId: topBid.userId,
        sellerId: product.sellerId,
        items: [
          {
            productId: product.id,
            title: product.title,
            imageUrl: (product.images as string[])[0] ?? "",
            unitPrice: topBid.amount,
            quantity: 1,
            sourceType: "AUCTION",
          },
        ],
        shipping: await defaultShippingFor(topBid.userId),
        paymentMethod: "MOCK",
      });
      await notify(
        topBid.userId,
        "AUCTION_WON",
        "SOLD! You won the auction 🎉",
        `You won ${product.title} for ${formatPeso(topBid.amount)}. Order ${order.orderNumber} created.`,
        `/orders/${order.id}`
      );
    } else {
      // The item was already out of stock through some other path by the
      // time the auction closed — don't promise an order for stock that
      // doesn't exist; the winning bidder needs a human to sort this out.
      await notify(
        topBid.userId,
        "AUCTION_WON",
        "You won the auction, but we hit a snag",
        `You won the bid for "${product.title}", but it just went out of stock. Our team will reach out to make this right.`,
        `/product/${product.id}`
      );
    }
  }

  return updated;
}

export async function placeBid(auctionId: string, userId: string, amount: number): Promise<BidResult> {
  const current = await finalizeIfExpired(auctionId);
  if (!current) return { success: false, message: "Auction not found." };
  if (current.status !== "RUNNING") return { success: false, message: "This auction has ended." };

  const minValid = current.currentBid + current.minIncrement;
  if (amount < minValid) {
    return { success: false, message: `Minimum bid is ${formatPeso(minValid)}.`, currentBid: current.currentBid };
  }

  const result = await prisma.auction.updateMany({
    where: { id: auctionId, currentBid: current.currentBid, status: "RUNNING" },
    data: { currentBid: amount },
  });

  if (result.count === 0) {
    return { success: false, message: "Someone just placed a higher bid. Try again.", currentBid: undefined };
  }

  await prisma.auctionBid.create({ data: { auctionId, userId, amount } });

  return { success: true, message: `Bid placed: ${formatPeso(amount)}`, currentBid: amount };
}

async function defaultShippingFor(userId: string) {
  const address = await prisma.address.findFirst({ where: { userId }, orderBy: { isDefault: "desc" } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return {
    name: address?.fullName ?? user?.name ?? "ATBP Buyer",
    phone: address?.phone ?? user?.phone ?? "+639170000000",
    address: address?.line1 ?? "To be confirmed",
    city: address?.city ?? "Metro Manila",
    province: address?.province ?? "Metro Manila",
    postalCode: address?.postalCode ?? "1000",
  };
}

function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount);
}
