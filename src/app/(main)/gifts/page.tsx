import type { Metadata } from "next";
import Link from "next/link";
import { Gift } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { GIFT_OCCASIONS, GIFT_RECIPIENTS, GIFT_BUDGETS, getInterest } from "@/lib/interests";
import { ProductCard } from "@/components/domain/product-card";
import { EmptyState } from "@/components/domain/empty-state";
import { getTrendingProductIdSet } from "@/lib/trending";
import { toProductCardData } from "@/lib/product-card-data";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";

export const dynamic = "force-dynamic";

interface SearchParams {
  occasion?: string;
  recipient?: string;
  budget?: string;
}

const GIFTS_TITLE = "Gift Ideas";
const GIFTS_DESCRIPTION =
  "Find gifts by occasion, recipient, or budget on ATBP. Browse handmade, vintage, and unique finds from independent sellers across the Philippines.";

export const metadata: Metadata = {
  title: GIFTS_TITLE,
  description: GIFTS_DESCRIPTION,
  openGraph: { title: GIFTS_TITLE, description: GIFTS_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: GIFTS_TITLE, description: GIFTS_DESCRIPTION },
};

function buildHref(sp: SearchParams, key: keyof SearchParams, value: string) {
  const next = { ...sp, [key]: sp[key] === value ? undefined : value };
  const params = new URLSearchParams();
  if (next.occasion) params.set("occasion", next.occasion);
  if (next.recipient) params.set("recipient", next.recipient);
  if (next.budget) params.set("budget", next.budget);
  const qs = params.toString();
  return `/gifts${qs ? `?${qs}` : ""}`;
}

export default async function GiftsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const session = await auth();
  const activeTags = [sp.occasion, sp.recipient, sp.budget].filter(Boolean) as string[];

  // A specific occasion/recipient/budget pick is itself gift intent — only fall
  // back to the generic "gifts" tag when nothing more specific is selected.
  const where = {
    status: "ACTIVE",
    AND: activeTags.length > 0
      ? activeTags.map((tag) => ({ tags: { array_contains: tag } }))
      : [{ tags: { array_contains: "gifts" } }],
  };

  const products = await prisma.product.findMany({
    where,
    include: { seller: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
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
          <Gift size={12} /> Gifts
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 md:text-3xl">Find a gift they won&apos;t expect</h1>
        <p className="mt-1 text-sm text-ink-500">Browse by occasion, recipient, or budget, and mix and match to narrow it down.</p>
      </div>

      <div className="space-y-3 px-4 md:px-6">
        <ChipRow label="Occasion" items={GIFT_OCCASIONS} activeSlug={sp.occasion} paramKey="occasion" sp={sp} />
        <ChipRow label="Recipient" items={GIFT_RECIPIENTS} activeSlug={sp.recipient} paramKey="recipient" sp={sp} />
        <ChipRow label="Budget" items={GIFT_BUDGETS} activeSlug={sp.budget} paramKey="budget" sp={sp} />
      </div>

      <div className="px-4 md:px-6">
        {products.length === 0 ? (
          <EmptyState icon={Gift} title="No gifts match yet" description="Try clearing a filter to see more ideas." />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChipRow({
  label, items, activeSlug, paramKey, sp,
}: { label: string; items: string[]; activeSlug?: string; paramKey: keyof SearchParams; sp: SearchParams }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {items.map((slug) => {
          const interest = getInterest(slug);
          const active = activeSlug === slug;
          return (
            <Link
              key={slug}
              href={buildHref(sp, paramKey, slug)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold whitespace-nowrap",
                active ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600 hover:border-ink-300"
              )}
            >
              {interest.emoji} {interest.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
