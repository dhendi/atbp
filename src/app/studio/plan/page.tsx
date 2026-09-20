import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveLimits, getSellerUsage, UNLIMITED } from "@/lib/services/seller-plan";
import { FOUNDING_PREMIUM_CODE } from "@/lib/services/founding-seller";
import { PlanActions } from "./plan-actions";
import { FoundingPremiumUpgradeCard } from "./founding-premium-upgrade-card";
import { PremiumSavingsCalculator } from "@/components/domain/premium-savings-calculator";
import { FoundingSellerBadge } from "@/components/domain/founding-seller-badge";
import { formatPeso } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudioPlanPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });

  // Server Component, not client render — wall-clock time here is correct, not impure.
  // eslint-disable-next-line react-hooks/purity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const [limits, usage, subscription, override, credits, plans, recentSales] = await Promise.all([
    getEffectiveLimits(seller!.id),
    getSellerUsage(seller!.id),
    prisma.sellerSubscription.findUnique({ where: { sellerId: seller!.id }, include: { plan: true } }),
    prisma.sellerPlanOverride.findUnique({ where: { sellerId: seller!.id } }),
    prisma.promotionalCredit.findMany({ where: { sellerId: seller!.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    // FOUNDING_PREMIUM is excluded from the generic upgrade/downgrade ladder —
    // it's rendered as its own dedicated card below, gated on foundingPremiumEligible.
    prisma.sellerPlan.findMany({ where: { code: { not: FOUNDING_PREMIUM_CODE } }, orderBy: { monthlyPrice: "asc" } }),
    prisma.order.aggregate({ where: { sellerId: seller!.id, createdAt: { gte: thirtyDaysAgo }, status: { not: "CANCELLED" } }, _sum: { subtotal: true } }),
  ]);
  const creditBalance = credits
    .filter((c) => !c.expiresAt || c.expiresAt > new Date())
    .reduce((sum, c) => sum + c.amount, 0);

  const isPremium = limits.planCode === "PREMIUM";
  const monthlySales = recentSales._sum.subtotal ?? 0;
  const premiumPlan = plans.find((p) => p.code === "PREMIUM");
  const potentialSavings = premiumPlan && !isPremium
    ? monthlySales * ((limits.transactionFeePercent - premiumPlan.transactionFeePercent) / 100) - premiumPlan.monthlyPrice
    : 0;
  const onFoundingPremium = limits.planCode === FOUNDING_PREMIUM_CODE;

  const isFoundingPlan = limits.planCode === "FOUNDING_PRO" || limits.planCode === FOUNDING_PREMIUM_CODE;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-ink-900">
        Plan & Billing
        {seller!.foundingSeller && <FoundingSellerBadge />}
      </h1>
      <p className="mb-6 text-sm text-ink-500">
        You&apos;re on {limits.planName === "Free" ? "the Free plan" : `ATBP ${limits.planName}`}.
      </p>

      {seller!.foundingSeller && seller!.foundingSellerNumber && (
        <div className="mb-6 rounded-card border border-amber-300 bg-amber-50 p-5">
          <p className="font-display text-lg font-semibold text-ink-900">🏆 Founding Seller</p>
          <p className="mt-1 text-sm text-ink-700">You&apos;re one of the first 200 sellers on ATBP, Founding Seller #{seller!.foundingSellerNumber}.</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-ink-500">Your founding benefits</p>
          <ul className="mt-2 grid gap-1.5 text-sm text-ink-800 sm:grid-cols-2">
            <li>✓ 8% commission for your first year</li>
            <li>✓ FREE Pro for 1 year (normally ₱699/mo)</li>
            <li>✓ Permanent Founding Seller status</li>
            <li>✓ Exclusive Premium pricing, for life</li>
            <li>✓ Premium available for ₱999/month (vs. ₱1,999/month standard)</li>
          </ul>
          {seller!.foundingSellerProEndDate && limits.isFoundingPromoActive && (
            <p className="mt-3 text-sm font-semibold text-amber-800">
              Free Pro ends {seller!.foundingSellerProEndDate.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}.
            </p>
          )}
        </div>
      )}

      <div className="mb-6 rounded-card border border-ink-100 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="flex items-center gap-2 text-lg font-extrabold text-ink-900">
              {limits.planName}
              {limits.planCode !== "FREE" && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isFoundingPlan ? "bg-amber-100 text-amber-800" : isPremium ? "bg-gold-100 text-gold-700" : "bg-brand-100 text-brand-700"}`}>
                  {limits.planCode.replace("_", " ")}
                </span>
              )}
            </p>
            <p className="text-sm text-ink-500">
              {limits.monthlyPrice === 0 ? "₱0/month" : `${formatPeso(limits.monthlyPrice)}/month`} · {limits.transactionFeePercent}% commission
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <UsageBar label="Active listings" current={usage.activeListings} max={limits.maxActiveListings} />
          <UsageBar label="New listings this month" current={usage.newListingsThisMonth} max={limits.maxNewListingsPerMonth} />
          <UsageBar label="Auctions started this week" current={usage.auctionsStartedThisWeek} max={limits.maxAuctionsPerWeek} />
          <UsageBar label="Active auctions" current={usage.activeAuctions} max={limits.maxActiveAuctions} />
        </div>

        {override && (
          <p className="mt-4 rounded-xl bg-teal-50 p-3 text-xs text-teal-700">
            You have a custom limit adjustment from ATBP support. {override.reason && `"${override.reason}"`}
          </p>
        )}

        <div className="mt-5 border-t border-ink-100 pt-4">
          <PlanActions
            currentPlanCode={limits.planCode}
            plans={plans.map((p) => ({ code: p.code, name: p.name, monthlyPrice: p.monthlyPrice }))}
            subscription={subscription ? { cancelAtPeriodEnd: subscription.cancelAtPeriodEnd, currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null } : null}
          />
          <p className="mt-2 text-[11px] text-ink-400">
            This runs through ATBP&apos;s demo payment flow, the same one used at checkout. Real billing arrives with PayMongo.
          </p>
        </div>
      </div>

      {seller!.foundingPremiumEligible && (
        <div className="mb-6">
          <FoundingPremiumUpgradeCard onFoundingPremium={onFoundingPremium} />
        </div>
      )}

      {isPremium ? (
        potentialSavings > 0 && (
          <div className="mb-6 rounded-card border border-live-200 bg-live-50 p-5">
            <p className="font-bold text-ink-900">You&apos;re saving {formatPeso(potentialSavings)} this month with Premium.</p>
            <p className="mt-1 text-sm text-ink-600">Based on {formatPeso(monthlySales)} in sales over the last 30 days, at 8% instead of 10% commission.</p>
          </div>
        )
      ) : seller!.foundingPremiumEligible ? null : (
        <div className="mb-6 space-y-4">
          {limits.planCode === "FREE" && premiumPlan && (
            <div className="rounded-card border border-gold-300 bg-gold-50 p-5">
              <p className="font-bold text-ink-900">Need more room to grow?</p>
              <p className="mt-1 text-sm text-ink-600">
                Upgrade to Pro and list up to {plans.find((p) => p.code === "PRO")?.maxActiveListings ?? 250} products while unlocking powerful tools to manage and grow your shop.
              </p>
            </div>
          )}
          <PremiumSavingsCalculator defaultMonthlySales={monthlySales > 0 ? Math.round(monthlySales) : 100_000} />
          {monthlySales > 0 && (
            <p className="text-sm text-ink-500">
              {potentialSavings > 0
                ? `You could save ${formatPeso(potentialSavings)}/month with Premium based on your current sales.`
                : "Premium starts saving you money once your monthly sales cover its subscription cost. The calculator above shows exactly where that is."}
            </p>
          )}
        </div>
      )}

      <div className="rounded-card border border-ink-100 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold text-ink-900">Promotional credits</p>
          <p className="font-extrabold text-ink-900">{formatPeso(creditBalance)}</p>
        </div>
        {credits.length === 0 ? (
          <p className="text-sm text-ink-500">No credit activity yet.</p>
        ) : (
          <div className="space-y-2">
            {credits.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-600">{sourceLabel(c.source)}</span>
                <span className={c.amount >= 0 ? "font-semibold text-teal-600" : "font-semibold text-ink-500"}>
                  {c.amount >= 0 ? "+" : ""}{formatPeso(c.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  if (max >= UNLIMITED) {
    return (
      <div>
        <p className="mb-1 text-xs text-ink-500">{label}</p>
        <p className="text-sm font-bold text-live-600">Unlimited</p>
      </div>
    );
  }
  const pct = Math.min(100, (current / max) * 100);
  const atLimit = current >= max;
  return (
    <div>
      <p className="mb-1 flex items-center justify-between text-xs text-ink-500">
        <span>{label}</span>
        <span className={atLimit ? "font-bold text-live-600" : "font-semibold text-ink-700"}>{current}/{max}</span>
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${atLimit ? "bg-live-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function sourceLabel(source: string) {
  switch (source) {
    case "PRO_MONTHLY_GRANT": return "Monthly plan credit";
    case "ADMIN_GRANT": return "Credit from ATBP";
    case "PROMOTION_SPEND": return "Spent on a promotion";
    case "REFUND": return "Refund";
    default: return source;
  }
}
