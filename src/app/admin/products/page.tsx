import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Package, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso } from "@/lib/utils";
import { ProductModerationActions } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "subtle" | "live" | "outline"> = {
  ACTIVE: "success",
  DRAFT: "outline",
  SOLD_OUT: "subtle",
  REMOVED: "subtle",
  FLAGGED: "live",
  PAUSED_CAP: "live",
};

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { seller: true, _count: { select: { reports: { where: { status: { in: ["OPEN", "REVIEWED"] } } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Products</h1>
      {products.length === 0 ? (
        <EmptyState icon={Package} title="No products" />
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                <Image src={(p.images as string[])[0]} alt={p.title} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{p.title}</p>
                <p className="text-xs text-ink-500">{p.seller.shopName} · {formatPeso(p.price)}</p>
              </div>
              <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{p.status.replace("_", " ")}</Badge>
              {p._count.reports > 0 && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-live-100 px-2 py-1 text-[11px] font-bold text-live-700">
                  <Flag size={11} /> {p._count.reports}
                </span>
              )}
              <ProductModerationActions productId={p.id} status={p.status} title={p.title} description={p.description} price={p.price} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
