import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSellerDashboardStats } from "@/lib/services/analytics";
import { getEffectiveLimits, getSellerUsage, UNLIMITED } from "@/lib/services/seller-plan";
import { formatPeso, timeAgo } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/domain/order-status-badge";
import { FoundingSellerBadge } from "@/components/domain/founding-seller-badge";
import { FoundingSellerDashboardCard } from "@/components/domain/founding-seller-dashboard-card";
import { RevenueChart } from "./revenue-chart";
import { TrendingUp, ShoppingBag, Eye, Users, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudioDashboardPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  const [stats, limits, usage] = await Promise.all([
    getSellerDashboardStats(seller!.id),
    getEffectiveLimits(seller!.id),
    getSellerUsage(seller!.id),
  ]);

  return (
    <div>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-ink-900">
        Welcome back, {seller!.shopName}
        {seller!.foundingSeller && <FoundingSellerBadge />}
      </h1>
      <p className="mb-6 text-sm text-ink-500">Here&apos;s how your shop is doing today.</p>

      {seller!.foundingSeller && seller!.foundingSellerNumber && seller!.foundingSellerProEndDate && (
        <FoundingSellerDashboardCard
          foundingSellerNumber={seller!.foundingSellerNumber}
          isFoundingPromoActive={limits.isFoundingPromoActive}
          onFoundingPremium={limits.planCode === "FOUNDING_PREMIUM"}
          foundingSellerProEndDate={seller!.foundingSellerProEndDate}
        />
      )}

      <Link
        href="/studio/plan"
        className="mb-6 flex items-center gap-4 rounded-card border border-ink-100 bg-white p-4 hover:bg-ink-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-ink-900">{limits.planName}</p>
            {limits.planCode !== "FREE" && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${limits.planCode === "PREMIUM" || limits.planCode === "FOUNDING_PREMIUM" ? "bg-gold-100 text-gold-700" : "bg-brand-100 text-brand-700"}`}>
                {limits.planCode.replace("_", " ")}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-500">
            {limits.monthlyPrice === 0 ? "₱0/month" : `${formatPeso(limits.monthlyPrice)}/month`} · {limits.transactionFeePercent}% commission ·{" "}
            {limits.maxActiveListings >= UNLIMITED ? "Unlimited listings" : `${usage.activeListings}/${limits.maxActiveListings} listings used`}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-brand-600">Manage plan</span>
        <ChevronRight size={16} className="shrink-0 text-ink-300" />
      </Link>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Today's Sales" value={formatPeso(stats.todaySales)} />
        <StatCard icon={TrendingUp} label="Orders Today" value={String(stats.todayOrdersCount)} />
        <StatCard icon={Eye} label="Live Viewers" value={String(stats.liveViewers)} />
        <StatCard icon={Users} label="New Followers" value={`+${stats.newFollowers}`} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_260px]">
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Revenue (last 14 days)</h2>
          <RevenueChart data={stats.revenueByDay} dataKey="revenue" />
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Conversion Rate</h2>
          <p className="text-3xl font-extrabold text-brand-600">{stats.conversionRate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-ink-500">Orders vs. product views across your shop.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink-900">Recent Orders</h2>
            <Link href="/studio/orders" className="text-xs font-semibold text-brand-600">View all</Link>
          </div>
          <div className="space-y-2.5">
            {stats.recentOrders.length === 0 && <p className="text-sm text-ink-400">No orders yet.</p>}
            {stats.recentOrders.map((o) => (
              <Link key={o.id} href={`/studio/orders`} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-ink-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{o.orderNumber}</p>
                  <p className="truncate text-xs text-ink-500">{o.buyer?.name ?? `${o.guestEmail} (guest)`} · {timeAgo(o.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold text-ink-900">{formatPeso(o.total)}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Top Products</h2>
          <div className="space-y-2.5">
            {stats.topProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-2 py-1.5">
                <p className="truncate text-sm font-semibold text-ink-800">{p.title}</p>
                <span className="shrink-0 text-xs text-ink-500">{p.viewCount} views</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <div className="rounded-card border border-ink-100 bg-white p-4">
      <Icon size={17} className="mb-2 text-brand-500" />
      <p className="text-xl font-extrabold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}
