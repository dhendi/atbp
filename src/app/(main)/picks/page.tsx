import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { SectionHeader } from "@/components/domain/section-header";
import { CollectionCard } from "@/components/domain/collection-card";
import { EmptyState } from "@/components/domain/empty-state";
import { getActiveCollections } from "@/lib/services/discovery";

export const dynamic = "force-dynamic";

const PICKS_TITLE = "ATBP Picks";
const PICKS_DESCRIPTION =
  "Browse ATBP Picks: curated collections of finds our team thinks are worth a look, updated regularly across categories and sellers.";

export const metadata: Metadata = {
  title: PICKS_TITLE,
  description: PICKS_DESCRIPTION,
  openGraph: { title: PICKS_TITLE, description: PICKS_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: PICKS_TITLE, description: PICKS_DESCRIPTION },
};

export default async function PicksIndexPage() {
  const picks = await getActiveCollections("PICK");

  return (
    <div className="pb-10 pt-4 md:pt-6">
      <SectionHeader eyebrow="✨ Handpicked" title="ATBP Picks" subtitle="Finds our team thinks are worth a look, updated regularly" />
      {picks.length === 0 ? (
        <div className="px-4 md:px-6"><EmptyState icon={Sparkles} title="No picks yet" description="Check back soon." /></div>
      ) : (
        <div className="flex flex-wrap gap-3 px-4 md:px-6">
          {picks.map((pick) => (
            <CollectionCard
              key={pick.id}
              href={`/picks/${pick.slug}`}
              title={pick.title}
              subtitle={pick.subtitle ?? undefined}
              emoji={pick.emoji ?? undefined}
              image={(pick.products[0]?.product.images as string[] | undefined)?.[0]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
