import { ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { sellerTierBadgeLabel } from "@/lib/services/seller-tier";

/** "BIR Certified Business" vs "Casual Seller" — driven strictly by
 * SellerProfile.birVerified, matching FoundingSellerBadge's pattern of never
 * deriving from the decorative, admin-editable `badges` list. */
export function SellerTierBadge({ birVerified, size = "sm", className }: { birVerified: boolean; size?: "sm" | "md"; className?: string }) {
  const label = sellerTierBadgeLabel(birVerified);
  const Icon = birVerified ? ShieldCheck : User;
  const tone = birVerified
    ? "border-live-300 bg-live-50 text-live-700"
    : "border-ink-200 bg-ink-50 text-ink-500";

  if (size === "md") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide", tone, className)}>
        <Icon size={13} /> {label}
      </span>
    );
  }
  return (
    <span
      title={birVerified ? "BIR-verified registered business" : "Not yet BIR-verified"}
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide", tone, className)}
    >
      <Icon size={10} /> {label}
    </span>
  );
}
