import { SectionHeader } from "@/components/domain/section-header";
import { ProductGridSkeleton } from "@/components/domain/product-grid-skeleton";

export default function ClosetsLoading() {
  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader eyebrow="🧺 Pre-loved, sold personally" title="Closets" subtitle="Real people clearing out real closets, inspected and honestly photographed." />
      <div className="px-4 md:px-6">
        <ProductGridSkeleton count={10} />
      </div>
    </div>
  );
}
