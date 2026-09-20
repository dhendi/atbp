import { SectionHeader } from "@/components/domain/section-header";
import { ProductGridSkeleton } from "@/components/domain/product-grid-skeleton";

export default function DiscoverLoading() {
  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader eyebrow="Browse" title="Discover" subtitle="Everything on ATBP, in one place" />
      <div className="px-4 md:px-6">
        <ProductGridSkeleton count={15} />
      </div>
    </div>
  );
}
