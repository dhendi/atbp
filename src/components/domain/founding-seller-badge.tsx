import { cn } from "@/lib/utils";

/**
 * The Founding Seller badge is an earned launch-status marker, not a paid
 * subscription indicator — deliberately amber/trophy-styled so it never
 * reads as the same thing as a Pro/Premium plan pill (bg-brand-100 / bg-gold-100
 * elsewhere in Studio). Driven strictly by SellerProfile.foundingSeller —
 * never derived from the decorative, admin-editable `badges` list.
 */
export function FoundingSellerBadge({ size = "sm", className }: { size?: "sm" | "md"; className?: string }) {
  if (size === "md") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-800",
          className
        )}
      >
        🏆 Founding Seller
      </span>
    );
  }
  return (
    <span
      title="One of ATBP's first 200 approved sellers"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800",
        className
      )}
    >
      🏆 Founding Seller
    </span>
  );
}
