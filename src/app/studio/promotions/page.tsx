import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPeso } from "@/lib/utils";
import { PromotionForm } from "./promotion-form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudioPromotionsPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });

  const [products, promotions, promotionTypes, creditRows] = await Promise.all([
    prisma.product.findMany({ where: { sellerId: seller!.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
    prisma.promotion.findMany({
      where: { sellerId: seller!.id },
      include: { product: true, promotionType: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.promotionType.findMany({ where: { category: "PRODUCT", active: true }, orderBy: { order: "asc" } }),
    prisma.promotionalCredit.findMany({ where: { sellerId: seller!.id } }),
  ]);
  const creditBalance = creditRows
    .filter((c) => !c.expiresAt || c.expiresAt > new Date())
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Promotions</h1>
      <p className="mb-6 text-sm text-ink-500">Pay to put a listing in front of more shoppers. Every paid spot is labeled &quot;Sponsored&quot; so it never blends in with organic results.</p>

      <div className="mb-6 rounded-card border border-ink-100 bg-white p-5">
        <h2 className="mb-3 font-bold text-ink-900">Promote a listing</h2>
        {products.length === 0 ? (
          <p className="text-sm text-ink-500">You need an active listing before you can promote one.</p>
        ) : (
          <PromotionForm products={products.map((p) => ({ id: p.id, title: p.title }))} promotionTypes={promotionTypes} creditBalance={creditBalance} />
        )}
      </div>

      <h2 className="mb-3 font-bold text-ink-900">Your promotions</h2>
      {promotions.length === 0 ? (
        <EmptyState icon={Megaphone} title="No promotions yet" description="Boost a listing above to get more eyes on it." />
      ) : (
        <div className="space-y-2">
          {promotions.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border border-ink-100 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{p.product?.title ?? "Listing removed"}</p>
                <p className="text-xs text-ink-500">
                  {p.promotionType.name} · {formatPeso(p.price)}{p.paidWithCredits ? " (credits)" : ""} · {p.impressions} views · {p.clicks} clicks
                </p>
              </div>
              <Badge variant={p.status === "ACTIVE" ? "live" : "subtle"}>{p.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
