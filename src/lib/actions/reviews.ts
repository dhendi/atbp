"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { sellerResponseSchema, firstIssue } from "@/lib/validation";

/** Casts a "helpful" / "not helpful" vote on a review, or changes/withdraws an
 * existing one — clicking the same choice again removes it, clicking the
 * other choice switches it. Blocks the review's own author and the review's
 * own seller from voting on it (a plausible way for either side to
 * artificially boost or bury it), and keeps Review.helpfulCount/
 * notHelpfulCount in sync with the real ReviewVote rows in one transaction. */
export async function voteReviewAction(reviewId: string, helpful: boolean) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  if (!(await checkRateLimit(`review-vote:${session.user.id}`, 60, 60_000))) {
    return { error: "Too many votes too quickly. Please wait a moment." };
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { seller: true } });
  if (!review || review.hidden) return { error: "Review not found." };
  if (review.buyerId === session.user.id) return { error: "You can't vote on your own review." };
  if (review.seller.userId === session.user.id) return { error: "You can't vote on reviews of your own shop." };

  const existing = await prisma.reviewVote.findUnique({
    where: { reviewId_userId: { reviewId, userId: session.user.id } },
  });

  let result: { helpfulCount: number; notHelpfulCount: number; viewerVote: boolean | null };

  await prisma.$transaction(async (tx) => {
    if (!existing) {
      await tx.reviewVote.create({ data: { reviewId, userId: session.user.id, helpful } });
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: helpful ? { helpfulCount: { increment: 1 } } : { notHelpfulCount: { increment: 1 } },
      });
      result = { helpfulCount: updated.helpfulCount, notHelpfulCount: updated.notHelpfulCount, viewerVote: helpful };
    } else if (existing.helpful === helpful) {
      // Same choice again — withdraw the vote.
      await tx.reviewVote.delete({ where: { id: existing.id } });
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: helpful ? { helpfulCount: { decrement: 1 } } : { notHelpfulCount: { decrement: 1 } },
      });
      result = { helpfulCount: updated.helpfulCount, notHelpfulCount: updated.notHelpfulCount, viewerVote: null };
    } else {
      // Switching from one choice to the other.
      await tx.reviewVote.update({ where: { id: existing.id }, data: { helpful } });
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: helpful
          ? { helpfulCount: { increment: 1 }, notHelpfulCount: { decrement: 1 } }
          : { helpfulCount: { decrement: 1 }, notHelpfulCount: { increment: 1 } },
      });
      result = { helpfulCount: updated.helpfulCount, notHelpfulCount: updated.notHelpfulCount, viewerVote: helpful };
    }
  });

  return { success: true, ...result! };
}

/** The review's own seller writes (or edits) a public reply — the seller-side
 * "respond to a review" feature. Only that seller, verified server-side via
 * their own session, can ever set this; there's no path for a buyer or a
 * different seller to write into it. */
export async function submitSellerResponseAction(reviewId: string, response: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const result = sellerResponseSchema.safeParse(response);
  if (!result.success) return { error: firstIssue(result) };

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "Not authorized." };

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.sellerId !== seller.id) return { error: "Not authorized." };

  const wasFirstResponse = !review.sellerResponse;

  await prisma.review.update({
    where: { id: reviewId },
    data: { sellerResponse: result.data, sellerRespondedAt: new Date() },
  });

  if (wasFirstResponse) {
    await notify(
      review.buyerId,
      "REVIEW_RESPONSE",
      "The seller replied to your review",
      `${seller.shopName} responded to the review you left.`,
      review.productId ? `/product/${review.productId}` : `/seller/${seller.handle}`
    );
  }

  revalidatePath(`/seller/${seller.handle}`);
  revalidatePath("/studio/reviews");
  if (review.productId) revalidatePath(`/product/${review.productId}`);
  return { success: true };
}
