import { SectionHeader } from "@/components/domain/section-header";
import { ProductGridSkeleton } from "@/components/domain/product-grid-skeleton";

export default function YardSalesLoading() {
  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader eyebrow="🏷️ Time-boxed clear-outs" title="Yard Sales" subtitle="One-time sales from sellers clearing out: here today, gone soon." />
      <div className="px-4 md:px-6">
        <ProductGridSkeleton count={10} />
      </div>
    </div>
  );
}
