import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, MapPin } from "lucide-react";
import { SectionHeader } from "@/components/domain/section-header";
import { ProductCard } from "@/components/domain/product-card";
import { EmptyState } from "@/components/domain/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCompactNumber } from "@/lib/utils";
import { toProductCardData } from "@/lib/product-card-data";
import { getTrendingProductIdSet } from "@/lib/trending";
import { getCollectionBySlug } from "@/lib/services/discovery";
import { auth } from "@/lib/auth";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pick = await getCollectionBySlug(slug);
  if (!pick) return { title: "Pick not found" };

  const title = `${pick.title}, an ATBP Pick`;
  const description = pick.subtitle?.slice(0, 160) ?? `${pick.title}, a curated collection handpicked by the ATBP team.`;
  const image = pick.products[0]?.product ? (pick.products[0].product.images as string[])[0] : undefined;

  return {
    title,
    description,
    openGraph: { title, description, images: image ? [{ url: image }] : undefined, type: "website" },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function PickDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const pick = await getCollectionBySlug(slug);
  if (!pick) notFound();

  const trendingIds = pick.products.length ? await getTrendingProductIdSet() : new Set<string>();
  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap(pick.products.map(({ product: p }) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  return (
    <div className="pb-10 pt-4 md:pt-6">
      <SectionHeader eyebrow="✨ ATBP Picks" title={`${pick.emoji ?? ""} ${pick.title}`.trim()} subtitle={pick.subtitle ?? undefined} />

      {pick.sellers.length > 0 && (
        <div className="no-scrollbar mb-6 flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
          {pick.sellers.map(({ seller: s }) => (
            <Link key={s.id} href={`/seller/${s.handle}`} className="flex w-28 shrink-0 flex-col items-center gap-1.5 text-center">
              <Avatar className="h-16 w-16">
                <AvatarImage src={s.logoUrl ?? undefined} />
                <AvatarFallback>{s.shopName[0]}</AvatarFallback>
              </Avatar>
              <span className="line-clamp-2 text-xs font-semibold text-ink-700">{s.shopName}</span>
              <span className="flex items-center gap-1 text-[10px] text-ink-400">
                {s.province && <><MapPin size={9} /> {s.province}</>}
              </span>
              <span className="text-[10px] text-ink-400">{formatCompactNumber(s.followerCount)} followers</span>
            </Link>
          ))}
        </div>
      )}

      <div className="px-4 md:px-6">
        {pick.products.length === 0 ? (
          pick.type !== "SHOPS" && <EmptyState icon={Sparkles} title="Nothing in this pick yet" />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {pick.products.map(({ product: p }) => (
              <ProductCard key={p.id} product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
