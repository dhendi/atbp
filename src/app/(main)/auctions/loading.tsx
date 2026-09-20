import { SectionHeader } from "@/components/domain/section-header";
import { ProductGridSkeleton } from "@/components/domain/product-grid-skeleton";

export default function AuctionsLoading() {
  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader eyebrow="🔨 Bid to win" title="Auctions" subtitle="Bid before someone else does" />
      <div className="px-4 md:px-6">
        <ProductGridSkeleton count={10} />
      </div>
    </div>
  );
}
