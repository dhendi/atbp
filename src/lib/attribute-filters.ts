import { Truck, Palette, Download, Zap, Archive, Tag, Star, ShieldCheck, Store } from "lucide-react";

// Shared between Discover's FilterBar and Search's SearchFilterBar so the two
// don't drift into different filter vocabularies for the same underlying
// Product fields. Food-category listings get their own set (shelf-stable
// instead of made-to-order/digital, which don't apply to packaged snacks).
export const GENERAL_ATTRIBUTE_FILTERS = [
  { key: "free-shipping", label: "Free Shipping", icon: Truck },
  { key: "on-sale", label: "On Sale", icon: Tag },
  { key: "star-sellers", label: "Star Sellers", icon: Star },
  { key: "verified", label: "Verified Sellers", icon: ShieldCheck },
  { key: "local-pickup", label: "Local Pickup", icon: Store },
  { key: "made-to-order", label: "Made-to-Order", icon: Palette },
  { key: "digital", label: "Digital Download", icon: Download },
  { key: "ready-to-ship", label: "Ready to Ship", icon: Zap },
] as const;

export const FOOD_ATTRIBUTE_FILTERS = [
  { key: "free-shipping", label: "Free Shipping", icon: Truck },
  { key: "on-sale", label: "On Sale", icon: Tag },
  { key: "star-sellers", label: "Star Sellers", icon: Star },
  { key: "verified", label: "Verified Sellers", icon: ShieldCheck },
  { key: "local-pickup", label: "Local Pickup", icon: Store },
  { key: "shelf-stable", label: "Shelf-Stable", icon: Archive },
] as const;

export const FOOD_GROUP_SLUG = "food-and-snacks";

export function isFoodCategorySlug(selectedCategory: string | null | undefined, categories: { slug: string; children: { slug: string }[] }[]): boolean {
  if (!selectedCategory) return false;
  if (selectedCategory === FOOD_GROUP_SLUG) return true;
  const foodGroup = categories.find((c) => c.slug === FOOD_GROUP_SLUG);
  return !!foodGroup?.children.some((ch) => ch.slug === selectedCategory);
}

/**
 * Maps the `attr` query param's chip keys onto Product/seller where-clause
 * fields. Kept in sync with the attribute chip lists above — add a new chip
 * key here and to one of the arrays above together.
 */
export function applyAttributeFilters(
  attrs: string[],
  where: Record<string, unknown>,
  sellerFilter: Record<string, unknown>
) {
  if (attrs.includes("free-shipping")) where.shippingAvailable = true;
  if (attrs.includes("made-to-order")) where.madeToOrder = true;
  if (attrs.includes("digital")) where.isDigital = true;
  if (attrs.includes("shelf-stable")) where.shelfStable = true;
  if (attrs.includes("local-pickup")) where.pickupAvailable = true;
  if (attrs.includes("on-sale")) {
    const now = new Date();
    where.dealPrice = { not: null };
    where.dealStartAt = { lte: now };
    where.dealEndAt = { gte: now };
  }
  if (attrs.includes("ready-to-ship")) {
    where.madeToOrder = false;
    where.isDigital = false;
  }
  if (attrs.includes("star-sellers") && !sellerFilter.rating) sellerFilter.rating = { gte: 4.5 };
  if (attrs.includes("verified")) sellerFilter.verified = true;
}
