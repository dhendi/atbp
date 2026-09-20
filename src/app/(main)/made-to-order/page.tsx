import type { Metadata } from "next";
import Link from "next/link";
import { Palette } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/domain/product-card";
import { EmptyState } from "@/components/domain/empty-state";
import { getTrendingProductIdSet } from "@/lib/trending";
import { toProductCardData } from "@/lib/product-card-data";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";

export const dynamic = "force-dynamic";

interface SearchParams {
  category?: string;
}

const MADE_TO_ORDER_TITLE = "Made-to-Order";
const MADE_TO_ORDER_DESCRIPTION =
  "Shop made-to-order finds on ATBP: custom jewelry, art, plushies, and more made after you order by independent sellers across the Philippines.";

export const metadata: Metadata = {
  title: MADE_TO_ORDER_TITLE,
  description: MADE_TO_ORDER_DESCRIPTION,
  openGraph: { title: MADE_TO_ORDER_TITLE, description: MADE_TO_ORDER_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: MADE_TO_ORDER_TITLE, description: MADE_TO_ORDER_DESCRIPTION },
};

export default async function MadeToOrderPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const session = await auth();

  const where = {
    status: "ACTIVE",
    madeToOrder: true,
    ...(sp.category ? { category: { slug: sp.category } } : {}),
  };

  const [products, categoryCounts] = await Promise.all([
    prisma.product.findMany({ where, include: { seller: true }, orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { status: "ACTIVE", madeToOrder: true },
      _count: { _all: true },
    }),
  ]);

  const categoryIds = categoryCounts.map((c) => c.categoryId);
  const categories = categoryIds.length
    ? await prisma.category.findMany({ where: { id: { in: categoryIds } }, orderBy: { order: "asc" } })
    : [];

  const trendingIds = await getTrendingProductIdSet();
  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap(products.map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  return (
    <div className="space-y-6 pb-10 pt-4 md:pt-6">
      <div className="px-4 md:px-6">
        <p className="font-tag mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
          <Palette size={12} /> Made-to-Order
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 md:text-3xl">Made just for you</h1>
        <p className="mt-1 text-sm text-ink-500">Custom pieces produced after you order: personalized jewelry, art, plushies, and more, worth the wait.</p>
      </div>

      {categories.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 md:px-6">
          <Link
            href="/made-to-order"
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold whitespace-nowrap",
              !sp.category ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600 hover:border-ink-300"
            )}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/made-to-order?category=${c.slug}`}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold whitespace-nowrap",
                sp.category === c.slug ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600 hover:border-ink-300"
              )}
            >
              {c.icon} {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="px-4 md:px-6">
        {products.length === 0 ? (
          <EmptyState icon={Palette} title="No made-to-order finds yet" description="Try clearing a filter, or check back soon. Sellers add custom pieces often." />
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-500">{products.length} custom finds</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
