import { Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/domain/empty-state";
import { enrichReviews } from "@/lib/services/reviews";
import { ReviewCard } from "@/components/domain/review-card";

export const dynamic = "force-dynamic";

export default async function StudioReviewsPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });

  const reviews = await prisma.review.findMany({
    where: { sellerId: seller!.id },
    include: { buyer: true, order: true, product: true },
    orderBy: { createdAt: "desc" },
  });
  const enrichedReviews = await enrichReviews(reviews, session!.user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">Reviews</h1>
        <div className="flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-sm font-bold text-gold-600">
          <Star size={15} className="fill-gold-400 text-gold-400" /> {seller!.rating.toFixed(1)} ({seller!.ratingCount})
        </div>
      </div>

      {enrichedReviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Reviews appear here once buyers complete an order and rate their purchase." />
      ) : (
        <div className="space-y-2">
          {enrichedReviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={{
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                photos: r.photos as string[],
                createdAt: r.createdAt.toISOString(),
                buyerName: r.buyer.name,
                buyerReviewCount: r.buyerReviewCount,
                helpfulCount: r.helpfulCount,
                notHelpfulCount: r.notHelpfulCount,
                viewerVote: r.viewerVote,
                sellerResponse: r.sellerResponse,
                sellerRespondedAt: r.sellerRespondedAt?.toISOString() ?? null,
                canRespond: r.canRespond,
                hidden: r.hidden,
              }}
              extra={
                <>
                  <span>Order {r.order.orderNumber}{r.product && ` · ${r.product.title}`}</span>
                  {r.hidden && <span className="rounded-full bg-ink-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-600">Hidden by ATBP</span>}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
