import type { Metadata } from "next";
import { cachedQuery } from "@/lib/cache";
import Image from "next/image";
import { MapPin, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SectionHeader } from "@/components/domain/section-header";

// This page has no auth()/cookies read of its own, but the shared (main)
// layout reads the area cookie for the nav — which forces every page in this
// route group to render dynamically regardless of its own `revalidate`
// export. So the actual win here is caching the query itself, not the page.
const getActiveMarkets = cachedQuery(
  async () => prisma.market.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ["active-markets"],
  { revalidate: 60, tags: ["markets"] }
);

const MARKETS_TITLE = "Markets";
const MARKETS_DESCRIPTION =
  "See weekend makers markets and pop-up bazaars featured on ATBP across the Philippines, with city, schedule, and details for each.";

export const metadata: Metadata = {
  title: MARKETS_TITLE,
  description: MARKETS_DESCRIPTION,
  openGraph: { title: MARKETS_TITLE, description: MARKETS_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: MARKETS_TITLE, description: MARKETS_DESCRIPTION },
};

export default async function MarketsPage() {
  const markets = await getActiveMarkets();

  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader
        eyebrow="IRL & online"
        title="ATBP markets"
        subtitle="Weekend makers markets and pop-up bazaars across the Philippines, brought online."
      />
      <p className="-mt-2 px-4 text-xs text-ink-400 md:px-6">
        These are example events for preview purposes and are not currently running ATBP markets.
      </p>
      <div className="grid gap-4 px-4 sm:grid-cols-2 md:px-6 lg:grid-cols-3">
        {markets.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-card border border-ink-200 bg-white">
            <div className="relative h-40">
              <Image src={m.imageUrl} alt={m.name} fill className="object-cover" />
            </div>
            <div className="p-4">
              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-brand-600">
                <MapPin size={11} /> {m.city}
              </p>
              <p className="font-display mt-1 text-lg font-semibold text-ink-900">{m.name}</p>
              {m.tagline && <p className="mt-1 text-sm text-ink-600">{m.tagline}</p>}
              {m.schedule && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
                  <Calendar size={12} /> {m.schedule}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
