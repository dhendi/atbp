import { Truck, Download, Palette, Zap, MapPin, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductAttributeInput {
  shippingAvailable?: boolean;
  pickupAvailable?: boolean;
  isDigital?: boolean;
  madeToOrder?: boolean;
  isFood?: boolean;
  shelfStable?: boolean;
}

export interface ProductAttributeBadge {
  key: string;
  label: string;
  icon: typeof Truck;
}

// Ordered by how distinctive the information is — a plain "Ready to Ship" on
// every non-custom item would just be noise, so it's last and usually trimmed
// off by `max` on cards; Digital/Made to Order are the most decision-relevant.
const DEFS: { key: string; label: string; icon: typeof Truck; test: (p: ProductAttributeInput) => boolean }[] = [
  { key: "digital", label: "Digital Download", icon: Download, test: (p) => !!p.isDigital },
  { key: "made-to-order", label: "Made to Order", icon: Palette, test: (p) => !!p.madeToOrder && !p.isDigital },
  { key: "shelf-stable", label: "Shelf-Stable", icon: Archive, test: (p) => !!p.isFood && !!p.shelfStable },
  { key: "free-shipping", label: "Free Shipping", icon: Truck, test: (p) => !!p.shippingAvailable && !p.isDigital },
  { key: "local-pickup", label: "Local Pickup", icon: MapPin, test: (p) => !!p.pickupAvailable },
  { key: "ready-to-ship", label: "Ready to Ship", icon: Zap, test: (p) => !p.madeToOrder && !p.isDigital },
];

export function getProductAttributeBadges(product: ProductAttributeInput): ProductAttributeBadge[] {
  return DEFS.filter((d) => d.test(product)).map(({ key, label, icon }) => ({ key, label, icon }));
}

export function ProductAttributeBadges({
  product, max, className,
}: { product: ProductAttributeInput; max?: number; className?: string }) {
  const badges = getProductAttributeBadges(product);
  const shown = typeof max === "number" ? badges.slice(0, max) : badges;
  if (shown.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {shown.map((b) => (
        <span key={b.key} className="flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
          <b.icon size={10} /> {b.label}
        </span>
      ))}
    </div>
  );
}
