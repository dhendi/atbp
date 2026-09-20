import { cachedQuery } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import type { SellerProfile } from "@prisma/client";
import { claimSlot, getSlotAvailability } from "@/lib/services/promotion-counter";

export const FOUNDING_SELLER_CAMPAIGN_ID = "FOUNDING_SELLER";
export const FOUNDING_SELLER_LIMIT = 200;
export const FOUNDING_PRO_MONTHS = 12;
export const FOUNDING_PRO_MONTHLY_VALUE = 699; // what the waived Pro subscription would normally cost
export const FOUNDING_PREMIUM_CODE = "FOUNDING_PREMIUM";
export const FOUNDING_PREMIUM_PRICE = 999;
// Founding Premium is a price discount only — same 8% commission as standard
// Premium. Do not reintroduce a lower commission rate here without being asked.
export const FOUNDING_PREMIUM_COMMISSION = 8;
export const FOUNDING_PRO_COMMISSION = 8;

// A "spots remaining" display — 60s staleness here is invisible to users;
// the actual slot claim (claimSlot, below) is a separate atomic DB operation
// unaffected by this cache, so there's no risk of over-granting slots.
export const getFoundingSellerAvailability = cachedQuery(
  async () => getSlotAvailability(FOUNDING_SELLER_CAMPAIGN_ID, FOUNDING_SELLER_LIMIT),
  ["founding-seller-availability"],
  { revalidate: 60, tags: ["founding-seller"] }
);

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Low-level, unconditional atomic grant — claims a slot and stamps the seller.
 * Called by maybeGrantFoundingSeller (automatic path) and adminGrantFoundingSeller
 * (manual override, see lib/actions/admin.ts) below. */
export async function grantFoundingSeller(sellerId: string): Promise<SellerProfile | null> {
  const number = await claimSlot(FOUNDING_SELLER_CAMPAIGN_ID);
  if (number === null) return null; // sold out

  const startDate = new Date();
  return prisma.sellerProfile.update({
    where: { id: sellerId },
    data: {
      foundingSeller: true,
      foundingSellerNumber: number,
      foundingSellerStartDate: startDate,
      foundingSellerProEndDate: addMonths(startDate, FOUNDING_PRO_MONTHS),
      foundingPremiumEligible: true,
      foundingPremiumPrice: FOUNDING_PREMIUM_PRICE,
      foundingPremiumCommission: FOUNDING_PREMIUM_COMMISSION,
    },
  });
}

/**
 * Call this after ANY change that could newly satisfy Founding Seller
 * eligibility — seller approval, and BIR verification — since either one can
 * be the second (qualifying) event depending on which order they happen in.
 * Eligibility is: status=APPROVED, a BUSINESS (not individual/personal)
 * seller, and admin-verified BIR registration. Safe to call repeatedly and
 * from multiple trigger points — a seller who already holds founding status,
 * or doesn't yet meet every condition, is simply left alone, so this can
 * never double-grant a slot or grant one to an ineligible seller.
 */
export async function maybeGrantFoundingSeller(sellerId: string): Promise<SellerProfile | null> {
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller || seller.foundingSeller) return null;
  if (seller.status !== "APPROVED") return null;
  if (seller.sellerKind !== "BUSINESS" || !seller.birVerified) return null;
  return grantFoundingSeller(sellerId);
}

/** Revokes a Founding Seller grant — for cause, or to correct a mistaken
 * manual grant. Deliberately does NOT free the claimed slot back into
 * PromotionCounter: slot numbers are meant to stay unique and sequential
 * (seller #47 should always mean the same seller, past or present), so a
 * revoked slot simply stays spent rather than being handed to someone else. */
export async function revokeFoundingSeller(sellerId: string): Promise<SellerProfile> {
  // A seller currently subscribed to the FOUNDING_PREMIUM plan would
  // otherwise keep its 8%-commission/₱999 benefits indefinitely even after
  // losing eligibility — move them to FREE so revocation actually revokes.
  const subscription = await prisma.sellerSubscription.findUnique({ where: { sellerId }, include: { plan: true } });
  if (subscription?.plan.code === "FOUNDING_PREMIUM") {
    const freePlan = await prisma.sellerPlan.findUnique({ where: { code: "FREE" } });
    if (freePlan) {
      await prisma.sellerSubscription.update({ where: { sellerId }, data: { planId: freePlan.id, cancelAtPeriodEnd: false } });
    }
  }

  return prisma.sellerProfile.update({
    where: { id: sellerId },
    data: {
      foundingSeller: false,
      foundingSellerNumber: null,
      foundingSellerStartDate: null,
      foundingSellerProEndDate: null,
      foundingPremiumEligible: false,
      foundingPremiumPrice: null,
      foundingPremiumCommission: null,
    },
  });
}

export function daysUntil(date: Date, from: Date = new Date()) {
  return Math.ceil((date.getTime() - from.getTime()) / 86400000);
}

/** "4 months" / "30 days" / "Ended" — used for the dashboard countdown. */
export function formatFoundingCountdown(proEndDate: Date, from: Date = new Date()) {
  const ms = proEndDate.getTime() - from.getTime();
  if (ms <= 0) return "Ended";
  const days = Math.ceil(ms / 86400000);
  if (days >= 60) return `${Math.round(days / 30)} months`;
  return `${days} day${days === 1 ? "" : "s"}`;
}
