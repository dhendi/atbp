"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claimSlot } from "@/lib/services/claims";
import { placeBid } from "@/lib/services/auctions";
import { reserveInventory, releaseInventory } from "@/lib/services/inventory";
import { notify } from "@/lib/services/notifications";
import { logProductEvent } from "@/lib/trending";
import { effectivePrice } from "@/lib/deals";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { sellerInactiveMessage } from "@/lib/constants";

export async function claimAction(livestreamProductId: string, slotNumber: number) {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Please log in to claim items." };
  const result = await claimSlot(livestreamProductId, slotNumber, session.user.id);
  revalidatePath("/live");
  return result;
}

export async function bidAction(auctionId: string, amount: number) {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Please log in to bid." };
  const result = await placeBid(auctionId, session.user.id, amount);
  return result;
}

export async function buyNowAction(productId: string, quantity = 1, personalizationNote?: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return { error: "Choose a quantity between 1 and 99." };
  // Buy Now holds real stock the moment it's clicked (before any payment), so
  // it's rate limited: otherwise a script could lock a seller's whole
  // inventory without ever paying.
  if (!(await checkRateLimit(`buy-now:${session.user.id}`, 30, 10 * 60_000))) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, include: { seller: true } });
  if (!product || product.status !== "ACTIVE") return { error: "Product not found." };
  if (sellerInactiveMessage(product.seller.status)) return { error: "This seller isn't taking orders right now." };
  if (product.seller.userId === session.user.id) return { error: "You can't buy your own listing." };
  if (product.listingType === "AUCTION") return { error: "This is an auction item. Place a bid instead." };

  const ok = await reserveInventory(productId, quantity);
  if (!ok) return { error: "Sorry, this item just sold out." };

  const cart = await prisma.cart.upsert({ where: { userId: session.user.id }, update: {}, create: { userId: session.user.id } });
  const cartItem = await prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity, unitPrice: effectivePrice(product), sourceType: "BUY_NOW", personalizationNote },
  });
  await logProductEvent(productId, "CART_ADD", session.user.id);

  return { success: true, cartItemId: cartItem.id };
}

export async function cancelReservedItemAction(cartItemId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  const item = await prisma.cartItem.findFirst({ where: { id: cartItemId, cart: { userId: session.user.id } } });
  if (!item) return { error: "Item not found." };
  if (item.sourceType === "BUY_NOW") await releaseInventory(item.productId, item.quantity);
  await prisma.cartItem.delete({ where: { id: cartItemId } });
  return { success: true };
}

export async function sendChatMessageAction(livestreamId: string, body: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in to chat." };
  if (!body.trim()) return { error: "Message can't be empty." };

  const message = await prisma.chatMessage.create({
    data: {
      livestreamId,
      userId: session.user.id,
      authorName: session.user.name ?? "Buyer",
      authorAvatar: session.user.image ?? null,
      body: body.slice(0, 300),
      type: "MESSAGE",
    },
  });
  return { success: true, message };
}

export async function toggleFollowAction(sellerId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const existing = await prisma.follow.findUnique({
    where: { followerId_sellerId: { followerId: session.user.id, sellerId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    await prisma.sellerProfile.update({ where: { id: sellerId }, data: { followerCount: { decrement: 1 } } });
    return { following: false };
  }

  await prisma.follow.create({ data: { followerId: session.user.id, sellerId } });
  const seller = await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: { followerCount: { increment: 1 } },
  });
  await notify(seller.userId, "NEW_FOLLOWER", "New follower!", `${session.user.name} started following you.`, "/profile");
  return { following: true };
}

// Both counters used to be open to anyone, unauthenticated and unlimited, so a
// loop could set any livestream's numbers to whatever it liked. Now they need
// an account and are rate limited per account (a real like/share is a
// handful of taps, not thousands).
export async function likeLivestreamAction(livestreamId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (!(await checkRateLimit(`stream-like:${session.user.id}:${livestreamId}`, 5, 10 * 60_000))) return { success: true };
  await prisma.livestream.updateMany({ where: { id: livestreamId }, data: { likeCount: { increment: 1 } } });
  return { success: true };
}

export async function shareLivestreamAction(livestreamId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (!(await checkRateLimit(`stream-share:${session.user.id}:${livestreamId}`, 3, 10 * 60_000))) return { success: true };
  await prisma.livestream.updateMany({ where: { id: livestreamId }, data: { shareCount: { increment: 1 } } });
  return { success: true };
}

export async function toggleReminderAction(livestreamId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const existing = await prisma.streamReminder.findUnique({
    where: { livestreamId_userId: { livestreamId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.streamReminder.delete({ where: { id: existing.id } });
    return { reminder: false };
  }

  await prisma.streamReminder.create({ data: { livestreamId, userId: session.user.id } });
  const stream = await prisma.livestream.findUnique({ where: { id: livestreamId } });
  if (stream) {
    await notify(
      session.user.id,
      "REMINDER",
      "Reminder set!",
      `We'll notify you when "${stream.title}" goes live.`,
      "/live"
    );
  }
  return { reminder: true };
}
