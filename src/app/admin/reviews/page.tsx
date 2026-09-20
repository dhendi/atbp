import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import { ReviewModerationActions } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    include: { buyer: true, seller: true, product: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Reviews</h1>
      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" />
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => {
            const photos = r.photos as string[];
            return (
              <div key={r.id} className={`rounded-card border p-3.5 ${r.hidden ? "border-ink-100 bg-ink-50" : "border-ink-100 bg-white"}`}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                    {r.buyer.name} → {r.seller.shopName}
                    {r.product && <span className="font-normal text-ink-500"> · {r.product.title}</span>}
                    {r.hidden && <Badge variant="subtle">Hidden</Badge>}
                  </p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={13} className={i < r.rating ? "fill-gold-400 text-gold-400" : "text-ink-200"} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-ink-600">{r.comment}</p>}
                {photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {photos.map((url, i) => (
                      <div key={i} className="relative h-14 w-14 overflow-hidden rounded-xl bg-ink-100">
                        <Image src={url} alt="Review photo" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-ink-400">{timeAgo(r.createdAt)}</p>
                {r.hidden && r.hiddenReason && <p className="mt-1 text-xs italic text-ink-500">Hidden reason: {r.hiddenReason}</p>}
                <ReviewModerationActions reviewId={r.id} hidden={r.hidden} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
