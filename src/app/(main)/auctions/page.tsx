import type { Metadata } from "next";
import { Gavel, Clock, Heart, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { settleExpiredAuctions, notifyStartedAuctions, notifyEndingSoonAuctions } from "@/lib/actions/auctions";
import { isPisoFind, isRapidAuction } from "@/lib/auction-format";
import { toProductCardData } from "@/lib/product-card-data";
import { ProductCard } from "@/components/domain/product-card";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { getCategoriesWithChildren, resolveCategoryIds } from "@/lib/categories";
import { getUserSignals, scoreBySignals } from "@/lib/services/personalization";
import { AUCTIONS_ENABLED } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

interface SearchParams {
  category?: string;
  sort?: string; // ending_soon | most_bids | newest
  format?: string; // piso | rapid | starting_soon | ending_tonight | following | recommended
}

const AUCTIONS_TITLE = "Auctions";
const AUCTIONS_DESCRIPTION =
  "Bid on live auctions on ATBP, including piso-start and rapid auctions from independent Filipino sellers. Browse by category before time runs out.";

export const metadata: Metadata = {
  title: AUCTIONS_TITLE,
  description: AUCTIONS_DESCRIPTION,
  openGraph: { title: AUCTIONS_TITLE, description: AUCTIONS_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: AUCTIONS_TITLE, description: AUCTIONS_DESCRIPTION },
};

export default async function AuctionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (!AUCTIONS_ENABLED) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          icon={Gavel}
          title="Auctions are coming soon"
          description="We're holding off on auctions for now. Check back as ATBP grows."
          action={{ href: "/discover", label: "Explore ATBP" }}
        />
      </div>
    );
  }

  const sp = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  await settleExpiredAuctions();
  await notifyStartedAuctions();
  await notifyEndingSoonAuctions();

  const categories = await getCategoriesWithChildren();
  const where: Record<string, unknown> = { status: "ACTIVE", listingType: "AUCTION", auction: { status: "ACTIVE" } };
  if (sp.category) {
    const ids = resolveCategoryIds(sp.category, categories);
    if (ids) where.categoryId = { in: ids };
  }

  const [allProducts, followedSellerIds] = await Promise.all([
    prisma.product.findMany({ where, include: { seller: true, auction: true } }),
    userId ? prisma.follow.findMany({ where: { followerId: userId }, select: { sellerId: true } }).then((f) => f.map((r) => r.sellerId)) : Promise.resolve<string[]>([]),
  ]);

  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(userId),
    getSocialProofMap(allProducts.map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  const now = new Date();
  const startingSoon = allProducts.filter((p) => new Date(p.auction!.startAt) > now).sort((a, b) => new Date(a.auction!.startAt).getTime() - new Date(b.auction!.startAt).getTime());

  if (sp.format === "starting_soon") {
    return (
      <AuctionsPageShell sp={sp} categories={categories} loggedIn={!!userId}>
        {startingSoon.length === 0 ? (
          <EmptyState icon={Clock} title="Nothing scheduled yet" description="Sellers haven't scheduled any upcoming auctions right now. Check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {startingSoon.map((p) => (
              <ProductCard key={p.id} product={toProductCardData(p, cardOpts(p.id))} />
            ))}
          </div>
        )}
      </AuctionsPageShell>
    );
  }

  let products = allProducts.filter((p) => new Date(p.auction!.startAt) <= now);

  if (sp.format === "piso") products = products.filter((p) => isPisoFind(p.auction!));
  else if (sp.format === "rapid") products = products.filter((p) => isRapidAuction(p.auction!));
  else if (sp.format === "ending_tonight") {
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    products = products.filter((p) => new Date(p.auction!.endAt) <= endOfToday);
  } else if (sp.format === "following") {
    products = userId ? products.filter((p) => followedSellerIds.includes(p.sellerId)) : [];
  }

  let sorted = products;
  if (sp.format === "recommended") {
    if (userId) {
      const signals = await getUserSignals(userId);
      sorted = signals.hasSignal
        ? [...products].map((p) => ({ p, s: scoreBySignals(p, signals) })).filter(({ s }) => s > 0).sort((a, b) => b.s - a.s).map(({ p }) => p)
        : [];
    } else {
      sorted = [];
    }
  } else if (sp.sort === "most_bids") sorted = [...products].sort((a, b) => (b.auction?.bidCount ?? 0) - (a.auction?.bidCount ?? 0));
  else if (sp.sort === "newest") sorted = [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  else sorted = [...products].sort((a, b) => new Date(a.auction!.endAt).getTime() - new Date(b.auction!.endAt).getTime());

  const emptyDescription = (() => {
    if (sp.format === "piso") return "No ₱1 piso start auctions at the moment. Check back soon.";
    if (sp.format === "rapid") return "No rapid auctions running right now. Check back soon.";
    if (sp.format === "ending_tonight") return "Nothing wrapping up today. Check Ending Soon for what's coming up.";
    if (sp.format === "following") return userId ? "Shops you follow don't have a live auction right now." : "Log in and follow some shops to see their auctions here.";
    if (sp.format === "recommended") return userId ? "Save, follow, or buy a few things and we'll start matching auctions to you." : "Log in to get auctions matched to what you're into.";
    return "Check back soon, or follow a seller to know when they list one.";
  })();

  return (
    <AuctionsPageShell sp={sp} categories={categories} loggedIn={!!userId}>
      {sorted.length === 0 ? (
        <EmptyState
          icon={sp.format === "following" ? Heart : sp.format === "recommended" ? Sparkles : Gavel}
          title={sp.format ? "None right now" : "No live auctions right now"}
          description={emptyDescription}
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {sorted.map((p) => (
            <ProductCard key={p.id} product={toProductCardData(p, cardOpts(p.id))} />
          ))}
        </div>
      )}
    </AuctionsPageShell>
  );
}

function AuctionsPageShell({
  sp, categories, loggedIn, children,
}: { sp: SearchParams; categories: { slug: string; name: string; icon: string }[]; loggedIn: boolean; children: React.ReactNode }) {
  function withParam(key: string, value: string | null) {
    const params = new URLSearchParams();
    if (sp.category) params.set("category", sp.category);
    if (sp.sort) params.set("sort", sp.sort);
    if (sp.format) params.set("format", sp.format);
    if (value === null) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    return `/auctions${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader
        eyebrow="🔨 Bid to win"
        title="Auctions"
        subtitle="Bid before someone else does"
      />

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 md:px-6">
        <SortChip href={withParam("format", null)} label="All Auctions" active={!sp.format} />
        <SortChip href={withParam("format", "ending_tonight")} label="🌙 Ending Tonight" active={sp.format === "ending_tonight"} />
        <SortChip href={withParam("format", "piso")} label="🪙 Piso Start (₱1)" active={sp.format === "piso"} gold />
        <SortChip href={withParam("format", "rapid")} label="⚡ Rapid Auctions" active={sp.format === "rapid"} />
        <SortChip href={withParam("format", "starting_soon")} label="🕐 Starting Soon" active={sp.format === "starting_soon"} teal />
        {loggedIn && <SortChip href={withParam("format", "following")} label="💌 Shops You Follow" active={sp.format === "following"} />}
        {loggedIn && <SortChip href={withParam("format", "recommended")} label="✨ Recommended" active={sp.format === "recommended"} />}
      </div>

      {sp.format !== "starting_soon" && sp.format !== "recommended" && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 md:px-6">
          <SortChip href={withParam("sort", null)} label="Ending Soon" active={!sp.sort} />
          <SortChip href={withParam("sort", "most_bids")} label="Most Bids" active={sp.sort === "most_bids"} />
          <SortChip href={withParam("sort", "newest")} label="Newest" active={sp.sort === "newest"} />
        </div>
      )}

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 md:px-6">
        <CategoryChip href={withParam("category", null)} label="All" active={!sp.category} />
        {categories.map((c) => (
          <CategoryChip key={c.slug} href={withParam("category", c.slug)} label={`${c.icon} ${c.name}`} active={sp.category === c.slug} />
        ))}
      </div>

      <div className="px-4 md:px-6">{children}</div>
    </div>
  );
}

function SortChip({ href, label, active, gold, teal }: { href: string; label: string; active: boolean; gold?: boolean; teal?: boolean }) {
  return (
    <a
      href={href}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap ${
        active
          ? gold
            ? "border-gold-600 bg-gold-600 text-white"
            : teal
              ? "border-teal-600 bg-teal-600 text-white"
              : "border-ink-900 bg-ink-900 text-white"
          : "border-ink-200 text-ink-600"
      }`}
    >
      {label}
    </a>
  );
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
