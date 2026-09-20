import { Gavel, Tag } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSellerDashboardStats, getSellerAuctionAndDealStats } from "@/lib/services/analytics";
import { formatPeso } from "@/lib/utils";
import { RevenueChart } from "../revenue-chart";
import { OrderStatusBadge } from "@/components/domain/order-status-badge";

export const dynamic = "force-dynamic";

export default async function StudioAnalyticsPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  const [stats, auctionDealStats] = await Promise.all([
    getSellerDashboardStats(seller!.id),
    getSellerAuctionAndDealStats(seller!.id),
  ]);

  const orders = await prisma.order.findMany({ where: { sellerId: seller!.id } });
  const byStatus = new Map<string, number>();
  for (const o of orders) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);

  const totalRevenue = orders.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = orders.length ? totalRevenue / orders.length : 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Analytics</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lifetime Revenue" value={formatPeso(totalRevenue)} />
        <Stat label="Total Orders" value={String(orders.length)} />
        <Stat label="Avg. Order Value" value={formatPeso(avgOrderValue)} />
        <Stat label="Conversion Rate" value={`${stats.conversionRate.toFixed(1)}%`} />
      </div>

      <div className="mb-6 rounded-card border border-ink-100 bg-white p-4">
        <h2 className="mb-3 font-bold text-ink-900">Revenue Trend</h2>
        <RevenueChart data={stats.revenueByDay} dataKey="revenue" />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><Gavel size={16} /> Auctions</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-extrabold text-ink-900">{auctionDealStats.auctionsWon}</p>
              <p className="text-[11px] text-ink-500">Won</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-ink-900">{formatPeso(auctionDealStats.auctionRevenue)}</p>
              <p className="text-[11px] text-ink-500">Revenue</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-ink-900">+{auctionDealStats.avgUpliftPct.toFixed(0)}%</p>
              <p className="text-[11px] text-ink-500">Avg. vs. start</p>
            </div>
          </div>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><Tag size={16} /> Deals</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-extrabold text-ink-900">{auctionDealStats.activeDeals}</p>
              <p className="text-[11px] text-ink-500">Active</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-ink-900">{auctionDealStats.dealOrdersCount}</p>
              <p className="text-[11px] text-ink-500">Items sold</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-ink-900">{formatPeso(auctionDealStats.dealRevenue)}</p>
              <p className="text-[11px] text-ink-500">Revenue</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Orders by Status</h2>
          <div className="space-y-2">
            {Array.from(byStatus.entries()).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <OrderStatusBadge status={status} />
                <span className="text-sm font-semibold text-ink-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Top Products by Views</h2>
          <div className="space-y-2">
            {stats.topProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-ink-800">{p.title}</span>
                <span className="text-ink-500">{p.viewCount} views · {p.likeCount} likes</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-ink-100 bg-white p-4">
      <p className="text-xl font-extrabold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}
