import { SectionHeader } from "@/components/domain/section-header";
import { ProductGridSkeleton } from "@/components/domain/product-grid-skeleton";

export default function TrendingLoading() {
  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader eyebrow="🔥 Popular this week" title="Trending" subtitle="What people are checking out right now" />
      <div className="px-4 md:px-6">
        <ProductGridSkeleton count={10} />
      </div>
    </div>
  );
}
