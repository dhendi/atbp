import { prisma } from "@/lib/prisma";

/** Recomputes a seller's rating/ratingCount from their non-hidden reviews
 * only — called after any review is created, hidden, unhidden, or deleted so
 * a moderated review can never keep inflating (or deflating) a seller's
 * displayed score. */
export async function recomputeSellerRating(sellerId: string) {
  const agg = await prisma.review.aggregate({ where: { sellerId, hidden: false }, _avg: { rating: true }, _count: true });
  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: { rating: agg._avg.rating ?? 0, ratingCount: agg._count },
  });
}

export interface ReviewEnrichment {
  buyerReviewCount: number;
  viewerVote: boolean | null; // true = voted helpful, false = voted not helpful, null = no vote
  canRespond: boolean; // viewer is the seller this review belongs to
}

/** Batches everything a review card needs beyond the Review row itself — the
 * reviewer's total (non-hidden) review count across ATBP, the viewer's own
 * "helpful" vote if any, and whether the viewer is allowed to respond (the
 * review's own seller) — into a handful of grouped queries instead of N+1
 * per-review lookups. Every review that reaches this always represents a
 * real completed purchase: submitReviewAction only ever creates a Review
 * alongside a COMPLETED Order, so there's no "verified purchase" flag to
 * compute — it's a structural guarantee, not a per-row check. */
export async function enrichReviews<T extends { id: string; buyerId: string; sellerId: string }>(
  reviews: T[],
  viewerId: string | null | undefined
): Promise<(T & ReviewEnrichment)[]> {
  if (reviews.length === 0) return [];

  const buyerIds = [...new Set(reviews.map((r) => r.buyerId))];
  const reviewIds = reviews.map((r) => r.id);

  const [buyerCounts, viewerVotes, viewerSeller] = await Promise.all([
    prisma.review.groupBy({ by: ["buyerId"], where: { buyerId: { in: buyerIds }, hidden: false }, _count: true }),
    viewerId ? prisma.reviewVote.findMany({ where: { reviewId: { in: reviewIds }, userId: viewerId } }) : Promise.resolve([]),
    viewerId ? prisma.sellerProfile.findUnique({ where: { userId: viewerId }, select: { id: true } }) : Promise.resolve(null),
  ]);

  const countByBuyer = new Map(buyerCounts.map((b) => [b.buyerId, b._count]));
  const voteByReview = new Map(viewerVotes.map((v) => [v.reviewId, v.helpful]));

  return reviews.map((r) => ({
    ...r,
    buyerReviewCount: countByBuyer.get(r.buyerId) ?? 1,
    viewerVote: voteByReview.has(r.id) ? voteByReview.get(r.id)! : null,
    canRespond: !!viewerSeller && viewerSeller.id === r.sellerId,
  }));
}
