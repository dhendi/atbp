import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { deleteDocumentBlob } from "@/lib/services/document-retention";
import { getSellerWallet } from "@/lib/services/analytics";
import { DELETED_ROLE } from "@/lib/auth-roles";

// Lives outside the "use server" actions files on purpose: every export of a
// "use server" module is a publicly callable endpoint, and these take a bare
// userId. Only the actions in lib/actions/account-deletion.ts and
// lib/actions/admin.ts call in here, each after its own authorization check.

const NON_TERMINAL_ORDER_STATUSES = ["PAYMENT_PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "DISPUTED"];

/** Everything that stops an account from being deleted right now. Empty means
 * it's safe to go ahead. Written so the message can be shown to the person
 * directly, and to an admin looking at someone else's account. */
export async function getAccountDeletionBlockers(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, sellerProfile: { select: { id: true, status: true } } } });
  if (!user) return ["This account no longer exists."];
  if (user.role === "ADMIN") return ["Admin accounts can't be deleted. Change the role first."];
  if (user.role === DELETED_ROLE) return ["This account has already been deleted."];

  const blockers: string[] = [];
  const seller = user.sellerProfile;

  const [buyerOrders, sellerOrders, buyerDisputes, sellerDisputes, activeBids] = await Promise.all([
    prisma.order.count({ where: { buyerId: userId, status: { in: NON_TERMINAL_ORDER_STATUSES } } }),
    seller ? prisma.order.count({ where: { sellerId: seller.id, status: { in: NON_TERMINAL_ORDER_STATUSES } } }) : Promise.resolve(0),
    prisma.dispute.count({ where: { raisedById: userId, status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    seller ? prisma.dispute.count({ where: { order: { sellerId: seller.id }, status: { in: ["OPEN", "UNDER_REVIEW"] } } }) : Promise.resolve(0),
    prisma.auctionBid.count({ where: { userId, auction: { status: "ACTIVE" } } }),
  ]);
  if (buyerOrders > 0) blockers.push(`${buyerOrders} order${buyerOrders === 1 ? "" : "s"} still in progress`);
  if (sellerOrders > 0) blockers.push(`${sellerOrders} shop order${sellerOrders === 1 ? "" : "s"} still in progress`);
  const disputes = buyerDisputes + sellerDisputes;
  if (disputes > 0) blockers.push(`${disputes} open dispute${disputes === 1 ? "" : "s"}`);
  if (activeBids > 0) blockers.push("bids on auctions that are still running");

  if (seller) {
    if (seller.status === "APPROVED") blockers.push("the shop is still open (close the store first)");
    const [wallet, pendingPayouts] = await Promise.all([
      getSellerWallet(seller.id),
      prisma.payout.count({ where: { sellerId: seller.id, status: { in: ["PENDING", "PROCESSING"] } } }),
    ]);
    if (wallet.availableBalance > 0) blockers.push("an unwithdrawn shop balance");
    if (pendingPayouts > 0) blockers.push("a payout that is still being processed");
  }
  return blockers;
}

/** Irreversibly strips personal data from an account and locks it, keeping the
 * rows other people's records depend on (orders, reviews, disputes, messages)
 * so they don't break. Caller must already have authorized this and checked
 * getAccountDeletionBlockers. */
export async function anonymizeAccount(userId: string): Promise<{ success: true } | { error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, phone: true, role: true, sellerProfile: { select: { id: true, idDocumentUrl: true, selfiePhotoUrl: true, businessLicenseUrl: true } } },
  });
  if (!user) return { error: "Account not found." };
  if (user.role === "ADMIN" || user.role === DELETED_ROLE) return { error: "This account can't be deleted." };

  const tag = user.id.slice(-10);
  const unusablePasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  const seller = user.sellerProfile;

  await prisma.$transaction(async (tx) => {
    // Shop follower counts are stored, not derived: give back each follow.
    const follows = await tx.follow.findMany({ where: { followerId: userId }, select: { sellerId: true } });
    for (const f of follows) {
      await tx.sellerProfile.updateMany({ where: { id: f.sellerId, followerCount: { gt: 0 } }, data: { followerCount: { decrement: 1 } } });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        role: DELETED_ROLE,
        email: `deleted-${tag}@deleted.atbp.local`,
        emailVerifiedAt: null,
        name: "Deleted user",
        username: `deleted_${tag}`,
        passwordHash: unusablePasswordHash,
        avatarUrl: null,
        phone: null,
        phoneVerifiedAt: null,
        bio: null,
        area: null,
        interests: [],
        marketingOptIn: false,
        // Kills every existing session on its next request.
        sessionVersion: { increment: 1 },
      },
    });

    // Personal data with no reason to outlive the account.
    await tx.address.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.twoFactorAuth.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.follow.deleteMany({ where: { followerId: userId } });
    await tx.savedProduct.deleteMany({ where: { userId } });
    await tx.streamReminder.deleteMany({ where: { userId } });
    await tx.dropReminder.deleteMany({ where: { userId } });
    await tx.eventInterest.deleteMany({ where: { userId } });
    await tx.blockedUser.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    await tx.lookingForPost.deleteMany({ where: { userId } });
    await tx.searchLog.deleteMany({ where: { userId } });
    await tx.userCollection.deleteMany({ where: { userId } });
    await tx.cart.deleteMany({ where: { userId } });
    if (user.phone) await tx.phoneOtpToken.deleteMany({ where: { phone: user.phone } });
    await tx.emailOtpToken.deleteMany({ where: { email: user.email } });
    // Support tickets stay as a record, minus who wrote them.
    await tx.supportTicket.updateMany({ where: { userId }, data: { name: "Deleted user", email: "deleted@deleted.atbp.local" } });

    if (seller) {
      await tx.product.updateMany({ where: { sellerId: seller.id, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
      await tx.sellerProfile.update({
        where: { id: seller.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closeReason: "Account deleted",
          shopName: "Deleted shop",
          handle: `deleted-${tag}`,
          description: null,
          story: null,
          bannerUrl: null,
          logoUrl: null,
          announcement: null,
          returnPolicy: null,
          socialLinks: {},
          publicAddress: null,
          mapLat: null,
          mapLng: null,
          pickupInstructions: null,
          birRegistrationNumber: null,
          idDocumentUrl: null,
          selfiePhotoUrl: null,
          businessLicenseUrl: null,
        },
      });
    }
  });

  // Uploaded ID files live outside the database; remove them too (best effort).
  if (seller) {
    await deleteDocumentBlob(seller.idDocumentUrl);
    await deleteDocumentBlob(seller.selfiePhotoUrl);
    await deleteDocumentBlob(seller.businessLicenseUrl);
  }
  return { success: true };
}
