import { prisma } from "@/lib/prisma";

// Lives outside the "use server" actions file on purpose: every export of a
// "use server" module is a publicly callable endpoint, and this one takes a
// sellerId and reveals a seller's open-order and dispute counts.
// Anything not in a terminal state still needs the seller around to fulfill,
// ship, or resolve it — closing the store with one of these still open would
// strand a buyer mid-order.
const NON_TERMINAL_ORDER_STATUSES = ["PAYMENT_PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "DISPUTED"];

/** What's currently blocking this seller from closing their store — empty if none. */
export async function getStoreClosureBlockers(sellerId: string) {
  const [openOrders, openDisputes] = await Promise.all([
    prisma.order.count({ where: { sellerId, status: { in: NON_TERMINAL_ORDER_STATUSES } } }),
    prisma.dispute.count({ where: { order: { sellerId }, status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
  ]);
  const blockers: string[] = [];
  if (openOrders > 0) blockers.push(`${openOrders} order${openOrders === 1 ? "" : "s"} still in progress`);
  if (openDisputes > 0) blockers.push(`${openDisputes} open dispute${openDisputes === 1 ? "" : "s"}`);
  return blockers;
}

