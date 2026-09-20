import { prisma } from "@/lib/prisma";
import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { MarketRow } from "./market-row";
import { AddMarketForm } from "./add-market-form";

export const dynamic = "force-dynamic";

export default async function AdminMarketsPage() {
  const markets = await prisma.market.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Markets</h1>

      {markets.length === 0 ? (
        <EmptyState icon={MapPin} title="No markets yet" />
      ) : (
        <div className="mb-6 space-y-2">
          {markets.map((m) => (
            <MarketRow key={m.id} market={m} />
          ))}
        </div>
      )}

      <div className="rounded-card border border-ink-100 bg-white p-4">
        <h2 className="mb-3 font-bold text-ink-900">Add a market</h2>
        <AddMarketForm />
      </div>
    </div>
  );
}
