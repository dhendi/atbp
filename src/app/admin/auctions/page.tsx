import { prisma } from "@/lib/prisma";
import { Gavel } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso, timeAgo } from "@/lib/utils";
import { AUCTIONS_ENABLED } from "@/lib/feature-flags";
import { CancelAuctionButton } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "live" | "success" | "subtle"> = {
  ACTIVE: "live",
  ENDED: "success",
  CANCELLED: "subtle",
};

export default async function AdminAuctionsPage() {
  const auctions = await prisma.productAuction.findMany({
    include: { product: { include: { seller: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-ink-900"><Gavel size={22} /> Auctions</h1>
      <p className="mb-6 text-sm text-ink-500">
        {!AUCTIONS_ENABLED && (
          <span className="mr-1 rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-gold-700">Feature currently disabled</span>
        )}
        Auctions are switched off site-wide (<code>AUCTIONS_ENABLED</code>) until there&apos;s a large enough buyer base. This page exists so admin tooling is ready before that flips on.
      </p>

      {auctions.length === 0 ? (
        <EmptyState icon={Gavel} title="No auctions" />
      ) : (
        <div className="space-y-2">
          {auctions.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{a.product.title}</p>
                <p className="text-xs text-ink-500">
                  {a.product.seller.shopName} · Current bid {formatPeso(a.currentBid)} · {a.bidCount} bid{a.bidCount === 1 ? "" : "s"} · ends {timeAgo(a.endAt)}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[a.status] ?? "outline"}>{a.status}</Badge>
              {a.status === "ACTIVE" && <CancelAuctionButton auctionId={a.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
