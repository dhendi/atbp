import { prisma } from "@/lib/prisma";
import type { SellerBadge } from "@/lib/constants";

/**
 * Badges that get computed from real marketplace activity, as opposed to
 * ones an admin grants directly (VERIFIED_SELLER, VERIFIED_MAKER,
 * VERIFIED_PRELOVED, AUTHENTICATED, FOUNDING_SELLER, LOCAL_SELLER,
 * PHYSICAL_STORE) — those represent a judgment call (an identity check, a
 * launch cohort, a real shop visited) that isn't derivable from stats alone.
 * `recomputeAllSellerBadges` only ever adds/removes badges in this list; it
 * never touches the admin-granted ones.
 *
 * Thresholds are intentionally conservative for a marketplace this size —
 * tune them as ATBP grows past its initial 10-50 sellers.
 */
const EARNED_BADGES: SellerBadge[] = ["SALES_100", "SALES_1000", "HIGHLY_RATED", "RISING_SELLER", "NEW_SELLER"];

const SALES_100_THRESHOLD = 100;
const SALES_1000_THRESHOLD = 1000;
const HIGHLY_RATED_MIN_RATING = 4.8;
const HIGHLY_RATED_MIN_REVIEWS = 10; // enough reviews that a high average means something
const RISING_SELLER_MAX_AGE_DAYS = 90; // "rising" implies new-ish, not an established shop
const RISING_SELLER_WINDOW_DAYS = 30;
const RISING_SELLER_MIN_RECENT_ORDERS = 5;
const CONFIRMED_ORDER_STATUSES = ["PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED"];
// Matches the "New Seller" badge description in lib/constants.ts — keep the
// two in sync. Purely time-based (see the seller's own SellerProfile.createdAt),
// so this falls off automatically once a seller ages past the window, on the
// next maintenance-cron run — no separate expiry job needed.
const NEW_SELLER_MAX_AGE_DAYS = 60;

/** What a single seller currently qualifies for, computed fresh from Order/Review data. */
export async function computeEarnedBadges(sellerId: string): Promise<SellerBadge[]> {
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return [];

  const earned: SellerBadge[] = [];

  if (seller.totalSales >= SALES_1000_THRESHOLD) earned.push("SALES_1000");
  else if (seller.totalSales >= SALES_100_THRESHOLD) earned.push("SALES_100");

  if (seller.ratingCount >= HIGHLY_RATED_MIN_REVIEWS && seller.rating >= HIGHLY_RATED_MIN_RATING) {
    earned.push("HIGHLY_RATED");
  }

  if (seller.createdAt >= new Date(Date.now() - NEW_SELLER_MAX_AGE_DAYS * 86400000)) {
    earned.push("NEW_SELLER");
  }

  const maxAge = new Date(Date.now() - RISING_SELLER_MAX_AGE_DAYS * 86400000);
  if (seller.createdAt >= maxAge) {
    const windowStart = new Date(Date.now() - RISING_SELLER_WINDOW_DAYS * 86400000);
    const recentOrders = await prisma.order.count({
      where: { sellerId, createdAt: { gte: windowStart }, status: { in: CONFIRMED_ORDER_STATUSES } },
    });
    if (recentOrders >= RISING_SELLER_MIN_RECENT_ORDERS) earned.push("RISING_SELLER");
  }

  return earned;
}

/**
 * Recomputes earned badges for every approved seller, preserving whatever
 * admin-granted badges are already on each one. Call from the maintenance
 * cron (see api/cron/maintenance) — this scans every seller, so it isn't
 * meant for a hot request path.
 */
export async function recomputeAllSellerBadges(): Promise<number> {
  const sellers = await prisma.sellerProfile.findMany({ where: { status: "APPROVED" }, select: { id: true, badges: true } });
  let changedCount = 0;

  for (const seller of sellers) {
    const currentBadges = seller.badges as string[];
    const adminGranted = currentBadges.filter((b) => !EARNED_BADGES.includes(b as SellerBadge));
    const earned = await computeEarnedBadges(seller.id);
    const nextBadges = [...new Set([...adminGranted, ...earned])];

    const changed = nextBadges.length !== currentBadges.length || !nextBadges.every((b) => currentBadges.includes(b));
    if (changed) {
      await prisma.sellerProfile.update({ where: { id: seller.id }, data: { badges: nextBadges } });
      changedCount++;
    }
  }

  return changedCount;
}
