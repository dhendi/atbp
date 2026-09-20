import { cachedQuery } from "@/lib/cache";
import { Briefcase, Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { ProductCard } from "@/components/domain/product-card";
import { toProductCardData } from "@/lib/product-card-data";
import { getTrendingProductIdSet } from "@/lib/trending";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ATBP Services",
  description: "Custom online services and instant-download digital products from independent Filipino sellers: design, writing, tutoring, templates, presets, and more.",
};

// The listing grids are identical for every visitor — only the wishlist-heart
// overlay below is personalized — so these are cached even though auth() above
// keeps the page itself dynamically rendered.
const getServiceListings = cachedQuery(
  async () =>
    prisma.product.findMany({
      where: { kind: "SERVICE", status: "ACTIVE" },
      include: { seller: true, auction: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ["service-listings"],
  { revalidate: 60, tags: ["products"] }
);

const getDigitalProductListings = cachedQuery(
  async () =>
    prisma.product.findMany({
      where: { kind: "DIGITAL_PRODUCT", status: "ACTIVE" },
      include: { seller: true, auction: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ["digital-product-listings"],
  { revalidate: 60, tags: ["products"] }
);

export default async function ServicesPage() {
  const session = await auth();

  const [services, digitalProducts] = await Promise.all([getServiceListings(), getDigitalProductListings()]);

  const trendingIds = await getTrendingProductIdSet();
  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap([...services, ...digitalProducts].map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ trending: trendingIds.has(id), isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [...services, ...digitalProducts].slice(0, 24).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": "Product", name: p.title, url: `${getSiteUrl()}/product/${p.id}` },
    })),
  };

  return (
    <div className="space-y-10 pt-4 md:pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema).replace(/</g, "\\u003c") }}
      />
      <SectionHeader
        eyebrow="💼 Online, remote-only work + instant downloads"
        title="ATBP Services"
        subtitle="Custom services and digital products from independent Filipino sellers. Delivered digitally, no shipping."
      />

      <section className="px-4 md:px-6">
        <h2 className="font-display mb-3 flex items-center gap-1.5 text-lg font-semibold text-ink-900">
          <Briefcase size={18} className="text-ink-400" /> Services
        </h2>
        {services.length === 0 ? (
          <EmptyState icon={Briefcase} title="No services yet" description="Check back soon. Sellers are just getting started." />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
            {services.map((p) => (
              <ProductCard key={p.id} product={toProductCardData(p, cardOpts(p.id))} />
            ))}
          </div>
        )}
      </section>

      <section className="px-4 md:px-6">
        <h2 className="font-display mb-3 flex items-center gap-1.5 text-lg font-semibold text-ink-900">
          <Download size={18} className="text-ink-400" /> Digital Products
        </h2>
        {digitalProducts.length === 0 ? (
          <EmptyState icon={Download} title="No digital products yet" description="Check back soon. Sellers are just getting started." />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
            {digitalProducts.map((p) => (
              <ProductCard key={p.id} product={toProductCardData(p, cardOpts(p.id))} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
