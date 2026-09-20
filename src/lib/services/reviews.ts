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
