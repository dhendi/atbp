import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";

/** Fans out to everyone following a seller — used when a followed shop publishes a new listing or starts an auction. Respects each follower's own notifyNewProducts/notifyNewAuctions preference. */
export async function notifyFollowersOfNewListing(sellerId: string, productId: string, productTitle: string) {
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return;

  const followers = await prisma.follow.findMany({ where: { sellerId, notifyNewProducts: true } });
  await Promise.all(
    followers.map((f) =>
      notify(
        f.followerId,
        "NEW_LISTING_FROM_FOLLOWED",
        `New from ${seller.shopName}`,
        `${seller.shopName} just listed "${productTitle}".`,
        `/product/${productId}`
      )
    )
  );
}

/** Fans out a shop announcement to every follower — same "tell my regulars"
 * behavior as a new listing, just for a message instead of a product. */
export async function notifyFollowersOfAnnouncement(sellerId: string, shopName: string, handle: string, announcement: string) {
  const followers = await prisma.follow.findMany({ where: { sellerId } });
  await Promise.all(
    followers.map((f) =>
      notify(f.followerId, "SHOP_ANNOUNCEMENT", `${shopName} posted an announcement`, announcement, `/seller/${handle}`)
    )
  );
}

export async function notifyFollowersOfNewAuction(sellerId: string, productId: string, productTitle: string) {
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return;

  const followers = await prisma.follow.findMany({ where: { sellerId, notifyNewAuctions: true } });
  await Promise.all(
    followers.map((f) =>
      notify(
        f.followerId,
        "NEW_AUCTION_FROM_FOLLOWED",
        `New auction from ${seller.shopName}`,
        `${seller.shopName} just started an auction for "${productTitle}".`,
        `/product/${productId}`
      )
    )
  );
}
