export type SellerTier = "CASUAL" | "BIR_VERIFIED" | "PRO" | "PREMIUM";

/** Derives a seller's tier live from birVerified + their active subscription
 * plan — never stored directly, so it can't drift from what getEffectiveLimits()
 * actually enforces. A CASUAL seller sells through My Closet / My Yard Sale
 * only — see lib/services/closet.ts and lib/services/yard-sale.ts for their
 * caps, which replaced the old seller-wide CASUAL cap this function used to
 * gate. My Shop (regular Product listings) requires birVerified. */
export function getSellerTier(seller: { birVerified: boolean }, planCode: string): SellerTier {
  if (!seller.birVerified) return "CASUAL";
  if (planCode === "PREMIUM" || planCode === "FOUNDING_PREMIUM") return "PREMIUM";
  if (planCode === "PRO" || planCode === "FOUNDING_PRO") return "PRO";
  return "BIR_VERIFIED";
}

/** The two badge labels called for in the seller-tiers spec — same label for
 * BIR_VERIFIED/PRO/PREMIUM, since the badge is about verification status, not
 * which paid plan a seller happens to be on. My Closet and My Yard Sale
 * sellers always show "Casual Seller" here, since neither mode requires
 * (or grants) BIR verification. */
export function sellerTierBadgeLabel(birVerified: boolean): string {
  return birVerified ? "BIR Certified Business" : "Casual Seller";
}
