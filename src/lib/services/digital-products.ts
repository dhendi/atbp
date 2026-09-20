import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/services/orders";

// Confirmed default: digital products deliver instantly, so there's no
// delivery/review step to wait on like goods or Services — this is purely a
// short buffer for a not-as-described/fraud dispute to surface before the
// seller's funds become payout-eligible.
export const DIGITAL_PRODUCT_HOLD_DAYS = 3;

const DOWNLOAD_TOKEN_TTL_MS = 30 * 24 * 60 * 60_000; // 30 days
const DOWNLOAD_TOKEN_MAX_USES = 10;

/** Called right at order creation for a DIGITAL_PRODUCT order — generates one
 * download token per order item, each good for DOWNLOAD_TOKEN_MAX_USES
 * downloads over 30 days. The buyer only ever sees this token (via
 * /api/downloads/[token]), never Product.digitalFileUrls directly. */
export async function issueDigitalDownloadTokens(orderItemIds: string[]) {
  const expiresAt = new Date(Date.now() + DOWNLOAD_TOKEN_TTL_MS);
  await prisma.digitalDownloadToken.createMany({
    data: orderItemIds.map((orderItemId) => ({
      orderItemId,
      token: randomBytes(32).toString("hex"),
      expiresAt,
      maxDownloads: DOWNLOAD_TOKEN_MAX_USES,
    })),
  });
}

/** Lazy sweep, same shape as autoConfirmOverdueShipments/
 * autoConfirmOverdueServiceOrders. A DIGITAL_PRODUCT order sits at
 * "PROCESSING" (set by createOrder right after payment) until this flips it
 * straight to "COMPLETED" once the hold window passes, which is what makes
 * the seller's funds payout-eligible (see getSellerWallet). Also called from
 * the daily maintenance cron (see api/cron/maintenance) as a backstop —
 * still called opportunistically from high-traffic order pages too, since
 * the cron is Hobby-plan-limited to once a day, too infrequent on its own. */
export async function releaseOverdueDigitalProductHolds() {
  const overdue = await prisma.order.findMany({
    where: { fulfillmentMethod: "DIGITAL_PRODUCT", status: "PROCESSING", createdAt: { lte: new Date(Date.now() - DIGITAL_PRODUCT_HOLD_DAYS * 86400000) } },
    select: { id: true },
  });
  for (const order of overdue) {
    await updateOrderStatus(order.id, "COMPLETED");
  }
  return overdue.length;
}
