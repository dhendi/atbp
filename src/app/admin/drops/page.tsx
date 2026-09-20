import { prisma } from "@/lib/prisma";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { DropRowActions } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "brand" | "live" | "subtle"> = {
  UPCOMING: "brand",
  LIVE: "live",
  ENDED: "subtle",
};

export default async function AdminDropsPage() {
  const drops = await prisma.drop.findMany({
    include: { seller: true, products: true },
    orderBy: { releaseAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Drops</h1>
      {drops.length === 0 ? (
        <EmptyState icon={Sparkles} title="No drops yet" />
      ) : (
        <div className="space-y-2">
          {drops.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-card border border-ink-100 bg-white p-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-bold text-ink-900">
                  {d.name} <Badge variant={STATUS_VARIANT[d.status] ?? "subtle"}>{d.status}</Badge>
                </p>
                <p className="text-xs text-ink-500">{d.seller.shopName} · {d.products.length} products · releases {d.releaseAt.toLocaleDateString()}</p>
              </div>
              {d.status !== "ENDED" && <DropRowActions dropId={d.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
