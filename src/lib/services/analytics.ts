import { prisma } from "@/lib/prisma";

/**
 * Seller earnings are derived from the real Commission row recorded at the
 * time each order was placed (see lib/services/commission.ts) rather than a
 * flat rate applied here — the rate varies by the seller's plan (10% Free/Pro,
 * 8% Premium) and a processing fee only applies to some payment methods, so
 * there's no single percentage that's correct for every order.
 *
 * Commission.subtotal excludes shipping (ATBP doesn't take a cut of it), so
 * shippingFee is added back per order to get the seller's real payout.
 */
export async function getSellerWallet(sellerId: string) {
  const [completedOrders, pendingOrders, payoutsCommitted, completedPayouts] = await Promise.all([
    // Only orders whose payment actually came in count as withdrawable: status
    // alone isn't proof of money (a seller-set COMPLETED on an unpaid order
    // must never become available balance). COD is settled on delivery, so a
    // completed COD order counts too.
    prisma.order.findMany({
      where: { sellerId, status: "COMPLETED", OR: [{ paymentStatus: "PAID" }, { paymentMethod: "COD" }] },
      include: { commission: true },
    }),
    prisma.order.findMany({ where: { sellerId, status: { in: ["PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"] } }, include: { commission: true } }),
    prisma.payout.aggregate({ where: { sellerId, status: { in: ["PAID", "PROCESSING"] } }, _sum: { amount: true } }),
    prisma.payout.findMany({ where: { sellerId, status: "PAID" }, orderBy: { processedAt: "desc" }, take: 10 }),
  ]);

  const payout = (order: (typeof completedOrders)[number]) => (order.commission?.sellerProceeds ?? order.subtotal) + order.shippingFee;
  const netCompleted = completedOrders.reduce((sum, o) => sum + payout(o), 0);
  const netPending = pendingOrders.reduce((sum, o) => sum + payout(o), 0);
  const committed = payoutsCommitted._sum.amount ?? 0;

  const allOrders = [...completedOrders, ...pendingOrders];
  const commissionPaid = allOrders.reduce((sum, o) => sum + (o.commission?.commissionAmount ?? 0), 0);
  const processingFeesPaid = allOrders.reduce((sum, o) => sum + (o.commission?.processingFee ?? 0), 0);

  return {
    availableBalance: Math.max(0, netCompleted - committed),
    pendingBalance: netPending,
    totalEarnings: netCompleted + netPending,
    platformFees: commissionPaid,
    processingFees: processingFeesPaid,
    completedPayouts,
  };
}

export async function getSellerDashboardStats(sellerId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayOrders = await prisma.order.findMany({ where: { sellerId, createdAt: { gte: startOfDay } } });
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);

  const liveStreams = await prisma.livestream.findMany({ where: { sellerId, status: "LIVE" } });
  const liveViewers = liveStreams.reduce((sum, s) => sum + s.viewerCount, 0);

  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const newFollowers = await prisma.follow.count({ where: { sellerId, createdAt: { gte: weekAgo } } });

  const totalOrders = await prisma.order.count({ where: { sellerId } });
  const totalViews = await prisma.product.aggregate({ where: { sellerId }, _sum: { viewCount: true } });
  const conversionRate = totalViews._sum.viewCount ? Math.min(100, (totalOrders / totalViews._sum.viewCount) * 100) : 0;

  const revenueByDay: { date: string; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const nextDay = new Date(day.getTime() + 86400000);
    const dayOrders = await prisma.order.findMany({
      where: { sellerId, createdAt: { gte: day, lt: nextDay }, status: { not: "CANCELLED" } },
    });
    revenueByDay.push({
      date: day.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
      revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
    });
  }

  const recentOrders = await prisma.order.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { buyer: true, items: true },
  });

  const topProducts = await prisma.product.findMany({
    where: { sellerId },
    orderBy: { viewCount: "desc" },
    take: 5,
  });

  return {
    todaySales,
    todayOrdersCount: todayOrders.length,
    liveViewers,
    newFollowers,
    conversionRate,
    revenueByDay,
    recentOrders,
    topProducts,
  };
}

export async function getSellerAuctionAndDealStats(sellerId: string) {
  const endedAuctions = await prisma.productAuction.findMany({
    where: { product: { sellerId }, status: "ENDED", winnerUserId: { not: null } },
  });
  const auctionsWon = endedAuctions.length;
  const auctionRevenue = endedAuctions.reduce((sum, a) => sum + a.currentBid, 0);
  const avgUpliftPct = auctionsWon
    ? endedAuctions.reduce((sum, a) => sum + ((a.currentBid - a.startingBid) / Math.max(a.startingBid, 1)) * 100, 0) / auctionsWon
    : 0;

  const activeDeals = await prisma.product.count({ where: { sellerId, dealPrice: { not: null } } });

  // No historical "price at purchase" ledger — an order item priced below the
  // product's current regular price is a reasonable proxy for "sold via deal".
  const orderItems = await prisma.orderItem.findMany({
    where: { order: { sellerId } },
    include: { product: true },
  });
  const dealItems = orderItems.filter((i) => i.product && i.unitPrice < i.product.price);
  const dealRevenue = dealItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return {
    auctionsWon,
    auctionRevenue,
    avgUpliftPct,
    activeDeals,
    dealOrdersCount: dealItems.length,
    dealRevenue,
  };
}

export async function getPlatformAnalytics() {
  const [totalUsers, totalSellers, pendingSellers, totalOrders, gmv, openReports, openDisputes, totalProducts, totalLivestreams, nonCancelledOrders, cancelledOrders, refundedDisputes] =
    await Promise.all([
      prisma.user.count(),
      prisma.sellerProfile.count({ where: { status: "APPROVED" } }),
      prisma.sellerProfile.count({ where: { status: "PENDING" } }),
      prisma.order.count(),
      prisma.order.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { total: true } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.livestream.count(),
      prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.dispute.count({ where: { status: "RESOLVED_REFUND" } }),
    ]);

  // AAV/refund/cancellation rate — previously absent from the admin
  // dashboard entirely (see the Admin Handbook's Monthly Business Review
  // gap list). Denominator for rates is every order ever placed, not just
  // non-cancelled ones, since a cancellation or refund is itself an outcome
  // of an order that was placed.
  const aov = nonCancelledOrders > 0 ? (gmv._sum.total ?? 0) / nonCancelledOrders : 0;
  const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
  const refundRate = totalOrders > 0 ? (refundedDisputes / totalOrders) * 100 : 0;

  const revenueByDay: { date: string; gmv: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const nextDay = new Date(day.getTime() + 86400000);
    const agg = await prisma.order.aggregate({
      where: { createdAt: { gte: day, lt: nextDay }, status: { not: "CANCELLED" } },
      _sum: { total: true },
    });
    revenueByDay.push({ date: day.toLocaleDateString("en-PH", { month: "short", day: "numeric" }), gmv: agg._sum.total ?? 0 });
  }

  return {
    totalUsers,
    totalSellers,
    pendingSellers,
    totalOrders,
    gmv: gmv._sum.total ?? 0,
    aov,
    cancellationRate,
    refundRate,
    openReports,
    openDisputes,
    totalProducts,
    totalLivestreams,
    revenueByDay,
  };
}

/** Top sellers by revenue — previously required a manual database query
 * (see the Admin Handbook's Weekly Checklist note: "Not computed — no
 * seller-by-revenue leaderboard exists"). Excludes cancelled orders. */
export async function getTopSellersByRevenue(limit = 10) {
  const rows = await prisma.order.groupBy({
    by: ["sellerId"],
    where: { status: { not: "CANCELLED" } },
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: "desc" } },
    take: limit,
  });
  const sellers = await prisma.sellerProfile.findMany({
    where: { id: { in: rows.map((r) => r.sellerId) } },
    select: { id: true, shopName: true, handle: true },
  });
  const byId = new Map(sellers.map((s) => [s.id, s]));
  return rows.map((r) => ({
    sellerId: r.sellerId,
    shopName: byId.get(r.sellerId)?.shopName ?? "Unknown",
    handle: byId.get(r.sellerId)?.handle ?? "",
    revenue: r._sum.total ?? 0,
    orderCount: r._count,
  }));
}

/** Repeat-purchase / repeat-sale rate — computed from existing order history,
 * no new tracking needed. A "repeat" buyer/seller is one with 2+ non-
 * cancelled orders ever (not windowed) — simple and stable, though it means
 * this creeps up over time rather than reflecting a specific recent period;
 * revisit with a rolling window once there's enough volume for that to be
 * more meaningful than noisy. Guest (unclaimed) orders are excluded from the
 * buyer side since there's no stable identity to track repeat behavior on. */
export async function getRetentionMetrics() {
  const [buyerOrderCounts, sellerOrderCounts] = await Promise.all([
    prisma.order.groupBy({ by: ["buyerId"], where: { status: { not: "CANCELLED" }, buyerId: { not: null } }, _count: true }),
    prisma.order.groupBy({ by: ["sellerId"], where: { status: { not: "CANCELLED" } }, _count: true }),
  ]);
  const totalBuyers = buyerOrderCounts.length;
  const repeatBuyers = buyerOrderCounts.filter((b) => b._count >= 2).length;
  const totalSellers = sellerOrderCounts.length;
  const repeatSellers = sellerOrderCounts.filter((s) => s._count >= 2).length;

  return {
    buyerRetentionRate: totalBuyers > 0 ? (repeatBuyers / totalBuyers) * 100 : 0,
    sellerRetentionRate: totalSellers > 0 ? (repeatSellers / totalSellers) * 100 : 0,
    totalBuyers,
    repeatBuyers,
    totalSellers,
    repeatSellers,
  };
}

/** Revenue by top-level category over a trailing window (default 90 days) —
 * the other computed-nowhere metric the handbook flagged. Rolls a leaf
 * category's revenue up to its parent so this stays readable as ~13 rows
 * rather than ~30 near-identical leaf categories. Bounded to a window
 * (rather than all-time) to keep the underlying order-item scan reasonable. */
export async function getCategoryBreakdown(days = 90) {
  const since = new Date(Date.now() - days * 86400000);
  const items = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } },
    select: {
      unitPrice: true,
      quantity: true,
      product: { select: { category: { select: { name: true, parent: { select: { name: true } } } } } },
    },
  });
  const totals = new Map<string, number>();
  for (const item of items) {
    const label = item.product.category.parent?.name ?? item.product.category.name;
    totals.set(label, (totals.get(label) ?? 0) + item.unitPrice * item.quantity);
  }
  return [...totals.entries()].map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue);
}
