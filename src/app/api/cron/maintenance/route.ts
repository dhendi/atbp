import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { settleExpiredAuctions, notifyStartedAuctions, notifyEndingSoonAuctions } from "@/lib/actions/auctions";
import { activateScheduledDrops } from "@/lib/services/drops";
import { expireOverdueYardSales } from "@/lib/services/yard-sale";
import { expireStaleOffers } from "@/lib/services/tawad";
import { pruneOldProductEvents } from "@/lib/trending";
import { autoConfirmOverdueShipments } from "@/lib/shipping/lifecycle";
import { autoConfirmOverdueServiceOrders } from "@/lib/services/service-orders";
import { releaseOverdueDigitalProductHolds } from "@/lib/services/digital-products";
import { settleExpiredPromotions } from "@/lib/services/promotions";
import { recomputeAllSellerBadges } from "@/lib/services/badges";
import { hideSuspendedSellerListings } from "@/lib/services/seller-suspension";

export const maxDuration = 60;

/**
 * Runs every "catch up" sweep that used to be called opportunistically on hot
 * read paths — settle expired auctions, activate scheduled drops, expire
 * overdue yard sales/stale Tawad offers, auto-confirm overdue
 * shipments/service orders/digital-product holds, settle expired
 * promotions — plus ProductEvent retention, on a schedule instead. See
 * vercel.json for the cron expression.
 *
 * These calls stay in place on their original page-load paths too (see each
 * function's own doc comment) — this project is on Vercel's Hobby plan,
 * which caps cron jobs at once a day, too infrequent on its own to replace
 * real-time checks like "did this auction just end" without visibly stale
 * behavior. This cron is a backstop, not (yet) a replacement; flip it to
 * every few minutes and drop the inline calls once on Pro.
 *
 * Requires `Authorization: Bearer $CRON_SECRET` (Vercel sends this
 * automatically for its own cron invocations once CRON_SECRET is set as an
 * env var) so this can't be triggered by an outside request.
 */
export async function GET(request: Request) {
  // Fail closed: with CRON_SECRET unset, the old comparison against the
  // literal string "Bearer undefined" would have let anyone in.
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const authorized =
    !!secret &&
    authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    settledAuctions,
    startedAuctions,
    endingSoonAuctions,
    activatedDrops,
    expiredYardSales,
    expiredOffers,
    prunedProductEvents,
    confirmedShipments,
    confirmedServiceOrders,
    releasedDigitalHolds,
    settledPromotions,
    sellersWithUpdatedBadges,
    hiddenSuspendedListings,
  ] = await Promise.all([
    settleExpiredAuctions(),
    notifyStartedAuctions(),
    notifyEndingSoonAuctions(),
    activateScheduledDrops(),
    expireOverdueYardSales(),
    expireStaleOffers(),
    pruneOldProductEvents(),
    autoConfirmOverdueShipments(),
    autoConfirmOverdueServiceOrders(),
    releaseOverdueDigitalProductHolds(),
    settleExpiredPromotions(),
    recomputeAllSellerBadges(),
    hideSuspendedSellerListings(),
  ]);

  // Sweeps above change what the "products"/"drops"/"sellers" caches would
  // return (an auction ending changes Product state, a drop going live is
  // itself Drop state, a recomputed badge changes SellerProfile) — mark them
  // stale rather than waiting out the 60s window.
  revalidateTag("products", "max");
  revalidateTag("drops", "max");
  revalidateTag("sellers", "max");

  return NextResponse.json({
    ok: true,
    settledAuctions,
    startedAuctions,
    endingSoonAuctions,
    activatedDrops,
    expiredYardSales,
    expiredOffers,
    prunedProductEvents,
    confirmedShipments,
    confirmedServiceOrders,
    releasedDigitalHolds,
    settledPromotions,
    sellersWithUpdatedBadges,
    hiddenSuspendedListings,
    ranAt: new Date().toISOString(),
  });
}
