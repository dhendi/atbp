import Image from "next/image";
import { Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/domain/empty-state";

export const dynamic = "force-dynamic";

export default async function StudioReviewsPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });

  const reviews = await prisma.review.findMany({
    where: { sellerId: seller!.id },
    include: { buyer: true, order: true, product: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">Reviews</h1>
        <div className="flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-sm font-bold text-gold-600">
          <Star size={15} className="fill-gold-400 text-gold-400" /> {seller!.rating.toFixed(1)} ({seller!.ratingCount})
        </div>
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Reviews appear here once buyers complete an order and rate their purchase." />
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => {
            const photos = r.photos as string[];
            return (
              <div key={r.id} className={`rounded-card border p-4 ${r.hidden ? "border-ink-100 bg-ink-50 opacity-70" : "border-ink-100 bg-white"}`}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="flex items-center gap-2 font-bold text-ink-900">
                    {r.buyer.name}
                    {r.hidden && <span className="rounded-full bg-ink-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-600">Hidden by ATBP</span>}
                  </p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className={i < r.rating ? "fill-gold-400 text-gold-400" : "text-ink-200"} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-ink-400">
                  Order {r.order.orderNumber}
                  {r.product && ` · ${r.product.title}`}
                </p>
                {r.comment && <p className="mt-2 text-sm text-ink-600">{r.comment}</p>}
                {photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {photos.map((url, i) => (
                      <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl bg-ink-100">
                        <Image src={url} alt="Review photo" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
