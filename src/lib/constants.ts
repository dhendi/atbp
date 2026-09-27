// Shared marketplace taxonomy — used by the seed script, product forms, and filters.

export const PRODUCT_TYPES = [
  { value: "HANDMADE", label: "Handmade", icon: "✂️" },
  { value: "PRE_LOVED", label: "Pre-Loved", icon: "♻️" },
  { value: "VINTAGE", label: "Vintage", icon: "🕐" },
  { value: "COLLECTIBLE", label: "Collectibles", icon: "🧸" },
  { value: "ART", label: "Art", icon: "🎨" },
  { value: "CUSTOM", label: "Custom", icon: "✨" },
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number]["value"];

export function productTypeLabel(value: string) {
  return PRODUCT_TYPES.find((t) => t.value === value)?.label ?? value;
}

// Condition grading. NEW/HANDMADE items use BRAND_NEW; pre-loved & vintage
// items use the standardized four-point scale. `definition` is the
// buyer-facing (and seller-facing, at listing time) explanation of what the
// grade actually means — shown as inline help/tooltip text wherever a
// condition is picked or displayed, so "Good" means the same thing to every
// seller and every buyer on ATBP.
export const CONDITIONS = [
  { value: "BRAND_NEW", label: "Brand New", definition: "Unused, in original packaging or with tags still attached, if it came with any." },
  { value: "LIKE_NEW", label: "Like New", definition: "Used once or twice at most, with no visible wear." },
  { value: "EXCELLENT", label: "Excellent", definition: "Gently used with only minor, hard-to-notice signs of wear." },
  { value: "GOOD", label: "Good", definition: "Visible signs of normal use, but fully functional and accurately photographed." },
  { value: "FAIR", label: "Fair", definition: "Noticeable wear or flaws. Check the photos and description closely before buying." },
] as const;

export type Condition = (typeof CONDITIONS)[number]["value"];

export function conditionLabel(value: string) {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}

export function conditionDefinition(value: string) {
  return CONDITIONS.find((c) => c.value === value)?.definition ?? null;
}

// Verification badges — shown carefully; never implies authentication we don't perform.
export const SELLER_BADGES = [
  { value: "VERIFIED_SELLER", label: "Verified Seller", description: "Identity and shop details confirmed by ATBP." },
  { value: "VERIFIED_MAKER", label: "Verified Maker", description: "Confirmed to hand-make what they sell." },
  { value: "VERIFIED_PRELOVED", label: "Verified Pre-Loved", description: "Meets ATBP's pre-loved listing standards." },
  { value: "AUTHENTICATED", label: "Authenticated", description: "Item(s) authenticated by an ATBP partner." },
  { value: "RISING_SELLER", label: "Rising Seller", description: "Gaining followers and sales fast." },
  { value: "HIGHLY_RATED", label: "Highly Rated", description: "Consistently rated 4.8 stars or higher." },
  { value: "FAST_SHIPPER", label: "Fast Shipper", description: "Ships orders quickly, most of the time." },
  { value: "LOCAL_SELLER", label: "Local Seller", description: "Offers local pickup or delivery in their area." },
  { value: "PHYSICAL_STORE", label: "Physical Store", description: "Has a real, visitable shop location." },
  { value: "FOUNDING_SELLER", label: "Founding Seller", description: "One of the first shops on ATBP." },
  { value: "SALES_100", label: "100 Sales", description: "Has completed 100+ orders." },
  { value: "SALES_1000", label: "1,000 Sales", description: "Has completed 1,000+ orders." },
  { value: "NEW_SELLER", label: "New Seller", description: "Joined ATBP in the last 60 days." },
] as const;

export type SellerBadge = (typeof SELLER_BADGES)[number]["value"];

// ---------- Seller account status ----------
// SUSPENDED (admin, for-cause) and CLOSED (the seller's own choice, via
// closeStoreAction) both mean "can't sell right now" for every gate check
// across the app — centralized here so the two statuses can't drift out of
// sync the way six near-duplicate `status === "SUSPENDED"` checks once did.
const INACTIVE_SELLER_STATUSES = new Set(["SUSPENDED", "CLOSED"]);

export function isSellerInactive(status: string): boolean {
  return INACTIVE_SELLER_STATUSES.has(status);
}

/** The message a buyer-facing action should show when a seller can't currently sell — `null` if they can. */
export function sellerInactiveMessage(status: string): string | null {
  if (status === "SUSPENDED") return "Your seller account is suspended. Contact support for more information.";
  if (status === "CLOSED") return "Your store is closed. Reopen it from Studio settings to sell again.";
  return null;
}

/** Same as sellerInactiveMessage, but also covers PENDING — for actions (like
 * creating a listing) that require full APPROVED status, not just "not
 * suspended/closed". */
export function sellerNotApprovedMessage(status: string): string | null {
  const inactive = sellerInactiveMessage(status);
  if (inactive) return inactive;
  if (status !== "APPROVED") return "Your seller account is still pending admin approval.";
  return null;
}

export function badgeLabel(value: string) {
  return SELLER_BADGES.find((b) => b.value === value)?.label ?? value;
}

export function badgeDescription(value: string) {
  return SELLER_BADGES.find((b) => b.value === value)?.description ?? null;
}

// ---------- Seller identity (KYC) verification ----------
export const ID_DOCUMENT_TYPES = [
  { value: "PHILSYS_ID", label: "PhilSys National ID" },
  { value: "PASSPORT", label: "Philippine Passport" },
  { value: "DRIVERS_LICENSE", label: "Driver's License" },
  { value: "UMID", label: "UMID" },
  { value: "POSTAL_ID", label: "Postal ID" },
  { value: "VOTERS_ID", label: "Voter's ID" },
] as const;

export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number]["value"];

export function idDocumentTypeLabel(value: string) {
  return ID_DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

const ID_VERIFICATION_GRACE_DAYS = 7;

/** For the casual selling paths (Closet/Yard Sale/Services/Digital Products),
 * which stay auto-approved and instantly listable by design — unlike My
 * Shop, which already hard-blocks createProductAction on birVerified/idVerified
 * before any listing can exist at all. This gives a grace window before
 * pausing *new* listings rather than blocking signup or existing listings,
 * so the "list something in two minutes" promise of casual selling still
 * holds while ID review catches up. `null` means the seller can list normally. */
export function idVerificationBlockMessage(seller: {
  idVerified: boolean;
  idSubmittedAt: Date | null;
  idRejectedReason: string | null;
}): string | null {
  if (seller.idVerified) return null;
  if (seller.idRejectedReason) {
    return "Your ID was sent back for changes. Resubmit it from Shop Settings before adding new listings.";
  }
  if (!seller.idSubmittedAt) return null; // pre-existing seller, from before ID verification shipped
  const graceMs = ID_VERIFICATION_GRACE_DAYS * 24 * 60 * 60_000;
  if (Date.now() - seller.idSubmittedAt.getTime() > graceMs) {
    return "Your ID verification is taking longer than expected. New listings are paused until it's approved. Contact support if this seems wrong.";
  }
  return null;
}

export const RATING_OPTIONS = [
  { value: "4.5", label: "4.5 ★ & up" },
  { value: "4", label: "4.0 ★ & up" },
  { value: "3.5", label: "3.5 ★ & up" },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "in_stock", label: "In Stock" },
  { value: "all", label: "Include Sold Out" },
] as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "best_selling", label: "Best Selling" },
  { value: "best_rated", label: "Best Rated" },
  { value: "one_of_a_kind", label: "One-of-a-Kind" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "az", label: "Alphabetical: A to Z" },
  { value: "za", label: "Alphabetical: Z to A" },
] as const;
