import type { Metadata } from "next";
import { cachedQuery } from "@/lib/cache";
import { Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isDealActive, discountPercent } from "@/lib/deals";
import { ProductCard } from "@/components/domain/product-card";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { toProductCardData } from "@/lib/product-card-data";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { getCategoriesWithChildren, resolveCategoryIds } from "@/lib/categories";
import { getSiteUrl } from "@/lib/site-url";
import { DealsSortSelect } from "./sort-select";

export const dynamic = "force-dynamic";

interface SearchParams {
  category?: string;
  sort?: string;
  max?: string;
}

const DEALS_TITLE = "Deals";
const DEALS_DESCRIPTION =
  "Browse today's active deals and discounts on ATBP from independent sellers across the Philippines. Filter by price and category to find the best drops.";

export const metadata: Metadata = {
  title: DEALS_TITLE,
  description: DEALS_DESCRIPTION,
  openGraph: { title: DEALS_TITLE, description: DEALS_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: DEALS_TITLE, description: DEALS_DESCRIPTION },
};

const PRICE_TIERS = [100, 300, 500];

// Deal eligibility (isDealActive) and sorting are cheap in-memory work done
// after this fetch, so only the DB query itself is cached — keyed by the
// category filter, since that's the only thing that changes the `where`.
const getDealCandidates = cachedQuery(
  async (categoryIds: string[] | null) => {
    const where: Record<string, unknown> = { status: "ACTIVE", listingType: "FIXED", dealPrice: { not: null } };
    if (categoryIds) where.categoryId = { in: categoryIds };
    return prisma.product.findMany({ where, include: { seller: true } });
  },
  ["deal-candidates"],
  { revalidate: 60, tags: ["products"] }
);

export default async function DealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const session = await auth();
  const categories = await getCategoriesWithChildren();

  const categoryIds = sp.category ? resolveCategoryIds(sp.category, categories) ?? null : null;
  const candidates = await getDealCandidates(categoryIds);
  const maxPrice = sp.max ? Number(sp.max) : null;
  const deals = candidates.filter((p) => isDealActive(p) && (maxPrice == null || (p.dealPrice as number) <= maxPrice));
  if (sp.sort === "ending_soon") {
    deals.sort((a, b) => (a.dealEndAt ? a.dealEndAt.getTime() : Infinity) - (b.dealEndAt ? b.dealEndAt.getTime() : Infinity));
  } else if (sp.sort === "price_asc") {
    deals.sort((a, b) => (a.dealPrice as number) - (b.dealPrice as number));
  } else if (sp.sort === "price_desc") {
    deals.sort((a, b) => (b.dealPrice as number) - (a.dealPrice as number));
  } else if (sp.sort === "az") {
    deals.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    deals.sort((a, b) => discountPercent(b) - discountPercent(a));
  }

  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap(deals.map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: deals.slice(0, 24).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": "Product", name: p.title, url: `${getSiteUrl()}/product/${p.id}` },
    })),
  };

  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema).replace(/</g, "\\u003c") }}
      />
      <SectionHeader eyebrow="🏷️ Today's deals" title="Deals today" subtitle="Good finds, better prices" />

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 md:px-6">
        <CategoryChip href={priceTierHref(sp, null)} label="All prices" active={!sp.max} />
        {PRICE_TIERS.map((tier) => (
          <CategoryChip key={tier} href={priceTierHref(sp, tier)} label={`Under ₱${tier}`} active={sp.max === String(tier)} />
        ))}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 md:px-6">
        <CategoryChip href="/deals" label="All" active={!sp.category} />
        {categories.map((c) => (
          <CategoryChip key={c.slug} href={`/deals?category=${c.slug}`} label={`${c.icon} ${c.name}`} active={sp.category === c.slug} />
        ))}
      </div>

      <div className="flex items-center justify-between px-4 md:px-6">
        <p className="text-xs text-ink-500">{deals.length} deal{deals.length !== 1 ? "s" : ""}</p>
        <DealsSortSelect />
      </div>

      <div className="px-4 md:px-6">
        {deals.length === 0 ? (
          <EmptyState icon={Tag} title="No active deals right now" description="Check back soon. Sellers schedule new deals regularly." />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {deals.map((p) => (
              <ProductCard key={p.id} product={toProductCardData(p, cardOpts(p.id))} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function priceTierHref(sp: SearchParams, max: number | null) {
  const params = new URLSearchParams();
  if (sp.category) params.set("category", sp.category);
  if (sp.sort) params.set("sort", sp.sort);
  if (max != null) params.set("max", String(max));
  const qs = params.toString();
  return `/deals${qs ? `?${qs}` : ""}`;
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap ${active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600"}`}
    >
      {label}
    </a>
  );
}
