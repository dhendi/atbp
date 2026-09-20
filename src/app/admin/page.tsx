import Link from "next/link";
import { Users, Store, ShoppingBag, Flag, Scale, Package, Radio, Receipt, Undo2, XCircle, Trophy, LayoutGrid, Repeat } from "lucide-react";
import { getPlatformAnalytics, getTopSellersByRevenue, getCategoryBreakdown, getRetentionMetrics } from "@/lib/services/analytics";
import { formatPeso } from "@/lib/utils";
import { RevenueChart } from "@/app/studio/revenue-chart";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, topSellers, categoryBreakdown, retention] = await Promise.all([
    getPlatformAnalytics(),
    getTopSellersByRevenue(10),
    getCategoryBreakdown(90),
    getRetentionMetrics(),
  ]);
  const maxCategoryRevenue = Math.max(1, ...categoryBreakdown.map((c) => c.revenue));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Platform Overview</h1>
      <p className="mb-6 text-sm text-ink-500">Monitor and moderate the ATBP marketplace.</p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={ShoppingBag} label="Total GMV" value={formatPeso(stats.gmv)} />
        <Stat icon={Users} label="Total Users" value={String(stats.totalUsers)} />
        <Stat icon={Store} label="Approved Sellers" value={String(stats.totalSellers)} />
        <Stat icon={Package} label="Active Products" value={String(stats.totalProducts)} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Receipt} label="Average Order Value" value={formatPeso(stats.aov)} />
        <Stat icon={Undo2} label="Refund Rate" value={`${stats.refundRate.toFixed(1)}%`} />
        <Stat icon={XCircle} label="Cancellation Rate" value={`${stats.cancellationRate.toFixed(1)}%`} />
        <Stat icon={Repeat} label="Buyer Retention" value={`${retention.buyerRetentionRate.toFixed(1)}%`} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Repeat} label="Seller Retention" value={`${retention.sellerRetentionRate.toFixed(1)}%`} />
        <AlertStat icon={Radio} label="Total Livestreams" value={stats.totalLivestreams} href="/admin/livestreams" />
        <AlertStat icon={Store} label="Pending Sellers" value={stats.pendingSellers} href="/admin/sellers" />
        <AlertStat icon={Flag} label="Open Reports" value={stats.openReports} href="/admin/reports" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <AlertStat icon={Scale} label="Open Disputes" value={stats.openDisputes} href="/admin/disputes" />
      </div>

      <div className="mb-6 rounded-card border border-ink-100 bg-white p-4">
        <h2 className="mb-3 font-bold text-ink-900">GMV (last 14 days)</h2>
        <RevenueChart data={stats.revenueByDay} dataKey="gmv" valueLabel="GMV" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><Trophy size={16} className="text-gold-500" /> Top Sellers by Revenue</h2>
          {topSellers.length === 0 ? (
            <p className="text-sm text-ink-500">No completed orders yet.</p>
          ) : (
            <div className="space-y-1.5">
              {topSellers.map((s, i) => (
                <Link key={s.sellerId} href={`/admin/sellers/${s.sellerId}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-ink-50">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-xs font-bold text-ink-400">{i + 1}</span>
                    <span className="font-semibold text-ink-900">{s.shopName}</span>
                    <span className="text-xs text-ink-400">@{s.handle}</span>
                  </span>
                  <span className="text-sm font-bold text-ink-900">{formatPeso(s.revenue)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><LayoutGrid size={16} className="text-teal-500" /> Revenue by Category (90d)</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-ink-500">No order activity in the last 90 days.</p>
          ) : (
            <div className="space-y-2">
              {categoryBreakdown.map((c) => (
                <div key={c.category}>
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-700">{c.category}</span>
                    <span className="text-ink-500">{formatPeso(c.revenue)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-100">
                    <div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${(c.revenue / maxCategoryRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-card border border-ink-100 bg-white p-4">
      <Icon size={17} className="mb-2 text-brand-500" />
      <p className="text-xl font-extrabold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function AlertStat({ icon: Icon, label, value, href }: { icon: typeof Users; label: string; value: number; href: string }) {
  return (
    <Link href={href} className={`rounded-card border p-4 transition-colors ${value > 0 ? "border-live-300 bg-live-50 hover:bg-live-100" : "border-ink-100 bg-white hover:bg-ink-50"}`}>
      <Icon size={17} className={value > 0 ? "mb-2 text-live-600" : "mb-2 text-ink-400"} />
      <p className={`text-xl font-extrabold ${value > 0 ? "text-live-600" : "text-ink-900"}`}>{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </Link>
  );
}
