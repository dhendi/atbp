import { Shirt } from "lucide-react";
import { getFeaturedClosets, getAllClosets } from "@/lib/services/closet";
import { ClosetCard } from "@/components/domain/closet-card";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Closets",
  description: "Pre-loved finds from real closets across the Philippines, inspected, laundered, and honestly photographed.",
};

export default async function ClosetsPage() {
  const [featured, all] = await Promise.all([getFeaturedClosets(12), getAllClosets(60)]);
  const featuredIds = new Set(featured.map((c) => c.id));
  const rest = all.filter((c) => !featuredIds.has(c.id));

  const listedProducts = [...featured, ...rest].flatMap((c) => c.products);
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
        eyebrow="🧺 Pre-loved, sold personally"
        title="Closets"
        subtitle="Real people clearing out real closets, inspected and honestly photographed."
      />

      {featured.length > 0 && (
        <section className="px-4 md:px-6">
          <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Staff Picks</h2>
          <div className="flex flex-wrap gap-3">
            {featured.map((c) => (
              <ClosetCard key={c.id} closet={c} />
            ))}
          </div>
        </section>
      )}

      <section className="px-4 md:px-6">
        <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">All Closets</h2>
        {rest.length === 0 && featured.length === 0 ? (
          <EmptyState icon={Shirt} title="No Closets yet" description="Check back soon. Sellers are just getting started." />
        ) : rest.length === 0 ? (
          <p className="text-sm text-ink-500">That&apos;s everything for now. Check back soon for more.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {rest.map((c) => (
              <ClosetCard key={c.id} closet={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
