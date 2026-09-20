import { ShieldCheck, Hammer, Recycle, Award, TrendingUp, Star, Zap, MapPin, Store, Flag, Medal, Gem } from "lucide-react";
import { badgeLabel, badgeDescription } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof ShieldCheck> = {
  VERIFIED_SELLER: ShieldCheck,
  VERIFIED_MAKER: Hammer,
  VERIFIED_PRELOVED: Recycle,
  AUTHENTICATED: Award,
  RISING_SELLER: TrendingUp,
  HIGHLY_RATED: Star,
  FAST_SHIPPER: Zap,
  LOCAL_SELLER: MapPin,
  PHYSICAL_STORE: Store,
  FOUNDING_SELLER: Flag,
  SALES_100: Medal,
  SALES_1000: Gem,
};

export function VerifiedBadge({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? ShieldCheck;
  const description = badgeDescription(type);
  return (
    <span
      title={description ? `${badgeLabel(type)}: ${description}` : badgeLabel(type)}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-600",
        className
      )}
    >
      <Icon size={11} /> {badgeLabel(type)}
    </span>
  );
}

// Most-meaningful-first — used to cap compact cards to a couple of badges
// instead of showing everything a seller has earned (real sellers vary; a
// card that always shows 5+ badges stops meaning anything).
const BADGE_PRIORITY = [
  "VERIFIED_SELLER", "SALES_1000", "SALES_100", "HIGHLY_RATED",
  "FAST_SHIPPER", "PHYSICAL_STORE", "LOCAL_SELLER", "RISING_SELLER", "FOUNDING_SELLER",
];

export function SellerBadgeRow({ badges, verified, className, max }: { badges: string[]; verified: boolean; className?: string; max?: number }) {
  const all = verified && !badges.includes("VERIFIED_SELLER") ? ["VERIFIED_SELLER", ...badges] : badges;
  if (all.length === 0) return null;
  const shown = max ? [...all].sort((a, b) => BADGE_PRIORITY.indexOf(a) - BADGE_PRIORITY.indexOf(b)).slice(0, max) : all;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {shown.map((b) => (
        <VerifiedBadge key={b} type={b} />
      ))}
    </div>
  );
}
