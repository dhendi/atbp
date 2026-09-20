import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/services/orders";
import { notify } from "@/lib/services/notifications";

// Matches AUTO_CONFIRM_DAYS in lib/shipping/lifecycle.ts — same buyer
// expectation as a goods delivery, reused deliberately (see the confirmation
// this was asked about before building).
export const SERVICE_AUTO_CONFIRM_DAYS = 7;

/** Also called from the daily maintenance cron (see api/cron/maintenance) as
 * a backstop — still called opportunistically from high-traffic order pages
 * too, same pattern as autoConfirmOverdueShipments, since the cron is
 * Hobby-plan-limited to once a day, too infrequent on its own. Idempotent
 * and cheap: a no-op once nothing is overdue. */
export async function autoConfirmOverdueServiceOrders() {
  const overdue = await prisma.serviceOrder.findMany({
    where: { status: "DELIVERED", autoConfirmAt: { lte: new Date() } },
    include: { order: { include: { seller: true } } },
  });
  for (const so of overdue) {
    await prisma.serviceOrder.update({ where: { id: so.id }, data: { status: "COMPLETED" } });
    await updateOrderStatus(so.orderId, "COMPLETED");
    await notify(so.order.seller.userId, "PAYMENT_RECEIVED", "Order auto-completed", `${so.order.orderNumber} auto-completed after ${SERVICE_AUTO_CONFIRM_DAYS} days with no response, and funds are now available for payout.`, "/studio/payouts");
  }
  return overdue.length;
}
