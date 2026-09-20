import { prisma } from "@/lib/prisma";
import { FOUNDING_PREMIUM_CODE, FOUNDING_PRO_COMMISSION } from "@/lib/services/founding-seller";
import { getSellerTier, type SellerTier } from "@/lib/services/seller-tier";

// Premium has no real cap on listings/auctions — stored as a large sentinel
// rather than null so every limit column stays a plain, non-nullable Int.
// Display code checks against this constant to render "Unlimited".
export const UNLIMITED = 999_999;

// The 6-value promotional-state classification used across commission
// display, the studio dashboard, and the admin Founding Seller report. It is
// derived, never stored — always recomputed from live seller/subscription
// state so it can never drift from the numbers that actually get charged.
export type PlanState = "standard_free" | "standard_pro" | "standard_premium" | "founding_free" | "founding_pro" | "founding_premium";

export interface EffectiveLimits {
  planCode: string;
  planName: string;
  monthlyPrice: number;
  transactionFeePercent: number;
  maxActiveListings: number;
  maxNewListingsPerMonth: number;
  maxAuctionsPerWeek: number;
  maxActiveAuctions: number;
  maxProductsPerAuction: number;
  features: string[];
  planState: PlanState;
  isFoundingPromoActive: boolean;
  birVerified: boolean;
  sellerTier: SellerTier;
}

function planTier(planCode: string): "free" | "pro" | "premium" {
  if (planCode === "PREMIUM" || planCode === FOUNDING_PREMIUM_CODE) return "premium";
  if (planCode === "PRO" || planCode === "FOUNDING_PRO") return "pro";
  return "free";
}

export interface SellerUsage {
  activeListings: number;
  newListingsThisMonth: number;
  auctionsStartedThisWeek: number;
  activeAuctions: number;
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Monday 00:00 of the current week, local server time — good enough for a soft weekly quota. */
function startOfWeek() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Falls back to the FREE plan for a seller with no subscription row (e.g. newly approved sellers). */
export async function getEffectiveLimits(sellerId: string): Promise<EffectiveLimits> {
  const [seller, subscription, override, freePlan, proPlan, birVerifiedPlan] = await Promise.all([
    prisma.sellerProfile.findUnique({ where: { id: sellerId } }),
    prisma.sellerSubscription.findUnique({ where: { sellerId }, include: { plan: true } }),
    prisma.sellerPlanOverride.findUnique({ where: { sellerId } }),
    prisma.sellerPlan.findUnique({ where: { code: "FREE" } }),
    prisma.sellerPlan.findUnique({ where: { code: "PRO" } }),
    prisma.sellerPlan.findUnique({ where: { code: "BIR_VERIFIED" } }),
  ]);
  if (!seller) throw new Error("Seller not found");
  if (!freePlan || !proPlan) throw new Error("No FREE/PRO plan configured — run the pricing seed.");

  const now = new Date();
  const onFoundingPremium = subscription?.status === "ACTIVE" && subscription.plan.code === FOUNDING_PREMIUM_CODE;
  const foundingWindowActive =
    !onFoundingPremium && seller.foundingSeller && !!seller.foundingSellerProEndDate && now < seller.foundingSellerProEndDate;

  let plan: {
    code: string; name: string; monthlyPrice: number; transactionFeePercent: number;
    maxActiveListings: number; maxNewListingsPerMonth: number; maxAuctionsPerWeek: number;
    maxActiveAuctions: number; maxProductsPerAuction: number; features: unknown;
  };
  let isFoundingPromoActive = false;

  if (onFoundingPremium) {
    plan = subscription!.plan;
  } else if (foundingWindowActive) {
    // The free 1-year Founding Pro benefit: real Pro-tier limits and
    // features (rule 11 — no unlimited listings during this window), but
    // ₱0/month and the founding 8% commission rather than Pro's normal
    // ₱699/10%. This is computed live from the real PRO plan row and the
    // seller's own foundingSellerProEndDate, so it requires no cron job to
    // expire — the moment `now` crosses that date this branch stops firing
    // and getEffectiveLimits silently falls through to the seller's real
    // subscription (defaulting to FREE if they never actively chose one).
    isFoundingPromoActive = true;
    plan = { ...proPlan, code: "FOUNDING_PRO", name: "Founding Pro", monthlyPrice: 0, transactionFeePercent: FOUNDING_PRO_COMMISSION };
  } else {
    // A BIR-verified seller with no active subscription (e.g. verified before
    // ever subscribing to anything) falls back to BIR_VERIFIED, not FREE —
    // verifyBirLicenseAction normally sets this up directly, this is just
    // the defensive path for whenever that hasn't happened yet.
    plan = subscription?.status === "ACTIVE" ? subscription.plan : seller.birVerified && birVerifiedPlan ? birVerifiedPlan : freePlan;
  }

  const planState: PlanState = `${seller.foundingSeller ? "founding" : "standard"}_${planTier(plan.code)}`;

  return {
    planCode: plan.code,
    planName: plan.name,
    monthlyPrice: plan.monthlyPrice,
    transactionFeePercent: plan.transactionFeePercent,
    maxActiveListings: override?.activeListingLimitOverride ?? plan.maxActiveListings,
    maxNewListingsPerMonth: override?.monthlyListingLimitOverride ?? plan.maxNewListingsPerMonth,
    maxAuctionsPerWeek: override?.weeklyAuctionLimitOverride ?? plan.maxAuctionsPerWeek,
    maxActiveAuctions: override?.activeAuctionLimitOverride ?? plan.maxActiveAuctions,
    maxProductsPerAuction: plan.maxProductsPerAuction,
    features: plan.features as string[],
    planState,
    isFoundingPromoActive,
    birVerified: seller.birVerified,
    sellerTier: getSellerTier(seller, plan.code),
  };
}

/** Always computed live from Product/ProductAuction — see the schema comment on why there's no maintained counter table. */
export async function getSellerUsage(sellerId: string): Promise<SellerUsage> {
  const [activeListings, newListingsThisMonth, auctionsStartedThisWeek, activeAuctions] = await Promise.all([
    prisma.product.count({ where: { sellerId, status: "ACTIVE" } }),
    prisma.product.count({ where: { sellerId, createdAt: { gte: startOfMonth() } } }),
    prisma.productAuction.count({ where: { product: { sellerId }, createdAt: { gte: startOfWeek() } } }),
    prisma.productAuction.count({ where: { product: { sellerId }, status: "ACTIVE" } }),
  ]);
  return { activeListings, newListingsThisMonth, auctionsStartedThisWeek, activeAuctions };
}

export interface LimitCheck {
  allowed: boolean;
  error?: string;
}

// FREE/BIR_VERIFIED -> PRO -> PREMIUM is the only upgrade path sellers are
// ever pointed toward from a limit message — PREMIUM has nothing above it to
// suggest. Getting BIR-verified (FREE -> BIR_VERIFIED) is handled separately
// in upgradeMessage below, since it's free and not a "plan" a seller selects.
function nextPlanCode(planCode: string): "PRO" | "PREMIUM" | null {
  if (planCode === "FREE" || planCode === "BIR_VERIFIED") return "PRO";
  if (planCode === "PRO") return "PREMIUM";
  return null;
}

async function upgradeMessage(currentPlanCode: string, birVerified: boolean, kind: "listings" | "auctions-weekly" | "auctions-active"): Promise<string> {
  if (!birVerified) {
    return kind === "listings"
      ? " Get BIR verified to raise your limit to 50 active listings, free, or go further with Pro/Premium once you're verified."
      : " Get BIR verified to unlock higher limits.";
  }
  const next = nextPlanCode(currentPlanCode);
  if (!next) return "";
  const nextPlan = await prisma.sellerPlan.findUnique({ where: { code: next } });
  if (!nextPlan) return "";

  if (kind === "listings") {
    const cap = nextPlan.maxActiveListings >= UNLIMITED ? "unlimited listings" : `up to ${nextPlan.maxActiveListings} products`;
    const commissionNote = nextPlan.transactionFeePercent < 10 ? ` and an ${nextPlan.transactionFeePercent}% commission` : "";
    return ` Upgrade to ${nextPlan.name} for ${cap}${commissionNote}.`;
  }
  return ` Upgrade to ${nextPlan.name} for more room.`;
}

/** Call before creating any new product row (draft or active) — this is the monthly quota, independent of current active count. */
export async function assertCanCreateListing(sellerId: string): Promise<LimitCheck> {
  const [limits, usage] = await Promise.all([getEffectiveLimits(sellerId), getSellerUsage(sellerId)]);
  if (usage.newListingsThisMonth >= limits.maxNewListingsPerMonth) {
    return {
      allowed: false,
      error: `You've reached your ${limits.planName} plan's new-listing limit for this month (${limits.maxNewListingsPerMonth}).${await upgradeMessage(limits.planCode, limits.birVerified, "listings")}`,
    };
  }
  return { allowed: true };
}

/** Call before a product becomes (or stays) ACTIVE — covers create-as-active, draft→active, and bulk-activate. `additional` is how many listings are being turned active in this one action. */
export async function assertCanActivateListings(sellerId: string, additional = 1): Promise<LimitCheck> {
  const [limits, usage] = await Promise.all([getEffectiveLimits(sellerId), getSellerUsage(sellerId)]);
  if (limits.maxActiveListings >= UNLIMITED) return { allowed: true };

  if (usage.activeListings + additional > limits.maxActiveListings) {
    let error: string;
    if (!limits.birVerified) {
      error = `You've reached your ${limits.maxActiveListings}-listing limit. Get BIR verified to raise it to 50 active listings, free, or go further with Pro/Premium once you're verified.`;
    } else {
      const next = nextPlanCode(limits.planCode);
      const nextPlan = next ? await prisma.sellerPlan.findUnique({ where: { code: next } }) : null;
      error = nextPlan
        ? `You've reached your ${limits.maxActiveListings}-listing limit. Upgrade to ${nextPlan.name} ${
            nextPlan.maxActiveListings >= UNLIMITED
              ? "for unlimited listings" + (nextPlan.transactionFeePercent < 10 ? ` and an ${nextPlan.transactionFeePercent}% commission` : "")
              : `to list up to ${nextPlan.maxActiveListings} products`
          }.`
        : `You've reached your ${limits.maxActiveListings}-listing limit.`;
    }
    return { allowed: false, error };
  }
  return { allowed: true };
}

/** Call before starting a new auction — checks both the weekly-started quota and the active-auctions cap. */
export async function assertCanStartAuction(sellerId: string): Promise<LimitCheck> {
  const [limits, usage] = await Promise.all([getEffectiveLimits(sellerId), getSellerUsage(sellerId)]);

  if (limits.maxAuctionsPerWeek < UNLIMITED && usage.auctionsStartedThisWeek >= limits.maxAuctionsPerWeek) {
    return {
      allowed: false,
      error: `You're at your ${limits.planName} plan's weekly auction limit (${limits.maxAuctionsPerWeek} per week).${await upgradeMessage(limits.planCode, limits.birVerified, "auctions-weekly")}`,
    };
  }
  if (limits.maxActiveAuctions < UNLIMITED && usage.activeAuctions >= limits.maxActiveAuctions) {
    return {
      allowed: false,
      error: `You've reached your ${limits.planName} plan's active auction limit (${limits.maxActiveAuctions} running at once).${await upgradeMessage(limits.planCode, limits.birVerified, "auctions-active")}`,
    };
  }
  return { allowed: true };
}

export function hasFeature(limits: EffectiveLimits, feature: string) {
  return limits.features.includes(feature);
}

/** Progress messaging for the Studio dashboard/plan page — "You're using 8 of 10 listings." etc. Returns null once a seller is safely under the "approaching" threshold, or for PREMIUM's unlimited tier. */
export function listingUsageMessage(limits: EffectiveLimits, activeListings: number): { atLimit: boolean; message: string } | null {
  if (limits.maxActiveListings >= UNLIMITED) return null;
  const atLimit = activeListings >= limits.maxActiveListings;
  const approaching = activeListings >= limits.maxActiveListings * 0.8;
  if (!atLimit && !approaching) return null;
  return { atLimit, message: `You're using ${activeListings} of ${limits.maxActiveListings} listings.` };
}
