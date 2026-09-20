import { SectionHeader } from "@/components/domain/section-header";
import { ProductGridSkeleton } from "@/components/domain/product-grid-skeleton";

export default function DealsLoading() {
  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader eyebrow="🏷️ Today's deals" title="Deals today" subtitle="Good finds, better prices" />
      <div className="px-4 md:px-6">
        <ProductGridSkeleton count={10} />
      </div>
    </div>
  );
}
