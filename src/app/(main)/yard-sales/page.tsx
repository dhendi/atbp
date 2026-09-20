import { Tent } from "lucide-react";
import { getYardSalesEndingSoon, getAllActiveYardSales } from "@/lib/services/yard-sale";
import { YardSaleCard } from "@/components/domain/yard-sale-card";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Yard Sales",
  description: "One-time clear-out sales from sellers across the Philippines: here today, gone soon.",
};

export default async function YardSalesPage() {
  const [endingSoon, all] = await Promise.all([getYardSalesEndingSoon(12), getAllActiveYardSales(60)]);
  const endingSoonIds = new Set(endingSoon.map((y) => y.id));
  const rest = all.filter((y) => !endingSoonIds.has(y.id));

  const listedProducts = [...endingSoon, ...rest].flatMap((y) => y.products);
  const seenProductIds = new Set<string>();
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: listedProducts
      .filter((p) => (seenProductIds.has(p.id) ? false : (seenProductIds.add(p.id), true)))
      .slice(0, 24)
      .map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: { "@type": "Product", name: p.title, url: `${getSiteUrl()}/product/${p.id}` },
      })),
  };

  return (
    <div className="space-y-8 pt-4 md:pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema).replace(/</g, "\\u003c") }}
      />
      <SectionHeader
        eyebrow="🏷️ Time-boxed clear-outs"
        title="Yard Sales"
        subtitle="One-time sales from sellers clearing out: here today, gone soon."
      />

      {endingSoon.length > 0 && (
        <section className="px-4 md:px-6">
          <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Ending Soon</h2>
          <div className="flex flex-wrap gap-3">
            {endingSoon.map((y) => (
              <YardSaleCard key={y.id} yardSale={y} />
            ))}
          </div>
        </section>
      )}

      <section className="px-4 md:px-6">
        <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">All Active Yard Sales</h2>
        {rest.length === 0 && endingSoon.length === 0 ? (
          <EmptyState
            icon={Tent}
            title="No active Yard Sales right now"
            description="Check back soon, or start your own from Sell."
            action={{ href: "/sell", label: "Start Selling" }}
          />
        ) : rest.length === 0 ? (
          <p className="text-sm text-ink-500">That&apos;s everything active right now. Check back soon for more.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {rest.map((y) => (
              <YardSaleCard key={y.id} yardSale={y} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
