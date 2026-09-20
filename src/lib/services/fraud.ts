import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";

/**
 * Rule-based fraud signals, run right after an order is created (see
 * checkoutAction/guest-checkout.ts). This never blocks a transaction — every
 * rule only writes a FraudFlag for admin review (see /admin/fraud-flags) —
 * because a false positive here means a legitimate buyer gets refused
 * service, which is worse than a human reviewing a handful of flagged orders
 * a day. Real ML-based scoring is a Planned / Future Feature; these
 * thresholds are deliberately simple and tunable, not a model.
 *
 * Guest checkout orders (buyerId null) are skipped — there's no account age
 * or order history to evaluate them against yet. A future rule keyed on
 * guestEmail/guestPhone velocity could cover that gap.
 */

const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60_000;
const NEW_ACCOUNT_VALUE_THRESHOLD = 10_000; // PHP

const RAPID_ORDER_WINDOW_MS = 60 * 60_000;
const RAPID_ORDER_COUNT_THRESHOLD = 5;

const REPEAT_CANCEL_WINDOW_MS = 30 * 24 * 60 * 60_000;
const REPEAT_CANCEL_COUNT_THRESHOLD = 3;

const COD_ABUSE_CANCEL_THRESHOLD = 2;

async function flag(input: { orderId: string; buyerId: string; sellerId: string; type: string; severity: "LOW" | "MEDIUM" | "HIGH"; reason: string }) {
  await prisma.fraudFlag.create({ data: input });
}

export async function evaluateOrderForFraud(order: { id: string; buyerId: string | null; sellerId: string; total: number; paymentMethod: string; createdAt: Date }) {
  if (!order.buyerId) return;
  const buyerId = order.buyerId;

  const buyer = await prisma.user.findUnique({ where: { id: buyerId }, select: { createdAt: true } });
  if (buyer && order.createdAt.getTime() - buyer.createdAt.getTime() < NEW_ACCOUNT_WINDOW_MS && order.total > NEW_ACCOUNT_VALUE_THRESHOLD) {
    await flag({
      orderId: order.id, buyerId, sellerId: order.sellerId,
      type: "NEW_ACCOUNT_HIGH_VALUE", severity: "MEDIUM",
      reason: `Account created under 24h ago placed a ₱${order.total.toLocaleString("en-PH")} order.`,
    });
  }

  const recentOrderCount = await prisma.order.count({
    where: { buyerId, createdAt: { gte: new Date(order.createdAt.getTime() - RAPID_ORDER_WINDOW_MS) } },
  });
  if (recentOrderCount >= RAPID_ORDER_COUNT_THRESHOLD) {
    await flag({
      orderId: order.id, buyerId, sellerId: order.sellerId,
      type: "RAPID_ORDERING", severity: "HIGH",
      reason: `${recentOrderCount} orders placed by this buyer in the last hour.`,
    });
  }

  const recentCancelCount = await prisma.order.count({
    where: { buyerId, status: "CANCELLED", updatedAt: { gte: new Date(order.createdAt.getTime() - REPEAT_CANCEL_WINDOW_MS) } },
  });
  if (recentCancelCount >= REPEAT_CANCEL_COUNT_THRESHOLD) {
    await flag({
      orderId: order.id, buyerId, sellerId: order.sellerId,
      type: "REPEAT_CANCELLATIONS", severity: "MEDIUM",
      reason: `${recentCancelCount} cancelled orders from this buyer in the last 30 days.`,
    });
  }

  if (order.paymentMethod === "COD") {
    const codCancelCount = await prisma.order.count({
      where: { buyerId, paymentMethod: "COD", status: "CANCELLED" },
    });
    if (codCancelCount >= COD_ABUSE_CANCEL_THRESHOLD) {
      await flag({
        orderId: order.id, buyerId, sellerId: order.sellerId,
        type: "COD_ABUSE_RISK", severity: "HIGH",
        reason: `${codCancelCount} previously cancelled COD orders from this buyer.`,
      });
    }
  }
}

/** Sellers with a recent cancellation/dispute rate high enough to be worth a
 * look — run on demand from the admin fraud queue rather than per-order,
 * since this is about a seller's pattern over time, not a single order. */
export async function flagHighRiskSellers() {
  const windowStart = new Date(Date.now() - REPEAT_CANCEL_WINDOW_MS);
  const sellers = await prisma.sellerProfile.findMany({
    where: { status: "APPROVED" },
    select: { id: true, userId: true, shopName: true },
  });

  for (const seller of sellers) {
    const [total, cancelled, disputed] = await Promise.all([
      prisma.order.count({ where: { sellerId: seller.id, createdAt: { gte: windowStart } } }),
      prisma.order.count({ where: { sellerId: seller.id, status: "CANCELLED", createdAt: { gte: windowStart } } }),
      prisma.order.count({ where: { sellerId: seller.id, status: "DISPUTED", createdAt: { gte: windowStart } } }),
    ]);
    if (total < 5) continue; // not enough volume for the rate to mean anything
    const riskRate = (cancelled + disputed) / total;
    if (riskRate <= 0.4) continue;

    const alreadyFlagged = await prisma.fraudFlag.findFirst({
      where: { sellerId: seller.id, type: "SELLER_RISK_RATE", resolvedAt: null },
    });
    if (alreadyFlagged) continue;

    await prisma.fraudFlag.create({
      data: {
        sellerId: seller.id,
        type: "SELLER_RISK_RATE",
        severity: "HIGH",
        reason: `${Math.round(riskRate * 100)}% of ${seller.shopName}'s last ${total} orders (${windowStart.toLocaleDateString("en-PH")}–now) were cancelled or disputed.`,
      },
    });
    await notify(
      seller.userId,
      "ACCOUNT_WARNING",
      "Unusual order activity on your shop",
      "We've noticed a higher-than-usual rate of cancelled or disputed orders recently. Our team is reviewing your account, and no action is needed from you right now.",
      "/studio/orders"
    );
  }
}
