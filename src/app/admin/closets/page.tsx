import { Shirt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/domain/empty-state";
import { ClosetFeaturedToggle } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminClosetsPage() {
  const closets = await prisma.closet.findMany({
    include: { seller: true, _count: { select: { products: { where: { status: "ACTIVE" } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Closets</h1>
      <p className="mb-6 text-sm text-ink-500">Toggle a Closet as a Discover &gt; Staff Pick.</p>
      {closets.length === 0 ? (
        <EmptyState icon={Shirt} title="No Closets yet" />
      ) : (
        <div className="space-y-2">
          {closets.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3.5">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink-900">{c.title}</p>
                <p className="text-xs text-ink-500">
                  {c.seller.shopName} · {c.city ?? "N/A"} · {c._count.products} active items
                </p>
              </div>
              <ClosetFeaturedToggle closetId={c.id} featured={c.featured} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
