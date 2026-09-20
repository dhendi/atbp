import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { currentUtcMonth, previousUtcMonth, utcMonthStart, utcMonthEnd } from "@/lib/utc-month";

// Its own cap pool, separate from Closet's (see SellerProfile.casualListing*
// fields) — a casual (non-birVerified) seller's Service + Digital Product
// listings share this one pool, independent of whatever they're doing in My
// Closet/Yard Sale. Same numbers, same shape (hard active-item cap +
// pause-at-cap monthly sales cap + 2-consecutive-months BIR nudge) as Closet,
// by explicit choice — see CLOSET_ACTIVE_ITEM_CAP/CLOSET_MONTHLY_SALES_CAP.
export const CASUAL_LISTING_ACTIVE_CAP = 20;
export const CASUAL_LISTING_MONTHLY_SALES_CAP = 50;

const CASUAL_KINDS = ["SERVICE", "DIGITAL_PRODUCT"] as const;

export interface LimitCheck {
  allowed: boolean;
  error?: string;
}

/** Call before activating a new Service/Digital Product listing for a
 * non-birVerified seller — birVerified sellers skip this check entirely
 * (see createServiceAction/createDigitalProductAction). */
export async function assertCanAddCasualListing(sellerId: string): Promise<LimitCheck> {
  const activeCount = await prisma.product.count({
    where: { sellerId, kind: { in: [...CASUAL_KINDS] }, status: "ACTIVE" },
  });
  if (activeCount >= CASUAL_LISTING_ACTIVE_CAP) {
    return {
      allowed: false,
      error: `You're at the ${CASUAL_LISTING_ACTIVE_CAP}-listing limit for casual Services/Digital Products. Remove one or get BIR verified to remove the cap.`,
    };
  }
  return { allowed: true };
}

async function pauseCasualListings(sellerId: string) {
  await prisma.product.updateMany({
    where: { sellerId, kind: { in: [...CASUAL_KINDS] }, status: "ACTIVE" },
    data: { status: "PAUSED_CAP" },
  });
}

async function unpauseCasualListings(sellerId: string) {
  await prisma.product.updateMany({
    where: { sellerId, kind: { in: [...CASUAL_KINDS] }, status: "PAUSED_CAP" },
    data: { status: "ACTIVE" },
  });
}

async function recordCapHit(seller: {
  id: string;
  userId: string;
  casualListingCapStreak: number;
  casualListingLastCapMonth: string | null;
  casualListingCapNudgeShown: boolean;
}, month: string) {
  if (seller.casualListingLastCapMonth === month) return; // idempotent within a month

  const wasConsecutive = seller.casualListingLastCapMonth === previousUtcMonth(month);
  const streak = wasConsecutive ? seller.casualListingCapStreak + 1 : 1;
  const shouldNudge = streak >= 2 && !seller.casualListingCapNudgeShown;

  await prisma.sellerProfile.update({
    where: { id: seller.id },
    data: {
      casualListingCapStreak: streak,
      casualListingLastCapMonth: month,
      casualListingCapNudgeShown: shouldNudge ? true : seller.casualListingCapNudgeShown,
    },
  });

  if (shouldNudge) {
    await notify(
      seller.userId,
      "REMINDER",
      "You're consistently maxing out your Services/Digital Products cap",
      "Get BIR verified to remove the 50-sale monthly cap on Services and Digital Products. It's free.",
      "/studio/plan"
    );
  }
}

/** Re-derives a seller's Service/Digital-Product monthly-sales-cap state from
 * live order data — call after an order for one of these kinds completes,
 * and it's safe to call anytime else too (idempotent). No cron in this app,
 * so this also doubles as the lazy month-rollover unpause check. Mirrors
 * syncClosetMonthlySalesCap exactly. */
export async function syncCasualListingMonthlySalesCap(sellerId: string) {
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller || seller.birVerified) return; // cap only ever applies to casual sellers

  const month = currentUtcMonth();
  const soldThisMonth = await prisma.order.count({
    where: {
      sellerId,
      items: { some: { product: { kind: { in: [...CASUAL_KINDS] } } } },
      deliveredAt: { gte: utcMonthStart(month), lt: utcMonthEnd(month) },
    },
  });

  if (soldThisMonth >= CASUAL_LISTING_MONTHLY_SALES_CAP) {
    await pauseCasualListings(sellerId);
    await recordCapHit(seller, month);
  } else {
    await unpauseCasualListings(sellerId);
    if (seller.casualListingLastCapMonth && seller.casualListingLastCapMonth !== month) {
      await prisma.sellerProfile.update({ where: { id: sellerId }, data: { casualListingCapStreak: 0, casualListingCapNudgeShown: false } });
    }
  }
}
