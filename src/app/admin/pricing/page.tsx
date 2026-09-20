import { prisma } from "@/lib/prisma";
import { PlanEditForm } from "./plan-edit-form";
import { PromotionTypeEditForm } from "./promotion-type-edit-form";
import { PricingConfigForm } from "./pricing-config-form";
import { SellerOverrideForm } from "./seller-override-form";
import { SellerPlanAssignForm } from "./seller-plan-assign-form";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const [plans, promotionTypes, configs, overrides, sellers, subscriptions] = await Promise.all([
    prisma.sellerPlan.findMany({ orderBy: { monthlyPrice: "asc" } }),
    prisma.promotionType.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] }),
    prisma.pricingConfig.findMany(),
    prisma.sellerPlanOverride.findMany({ include: { seller: true }, orderBy: { updatedAt: "desc" } }),
    prisma.sellerProfile.findMany({ where: { status: "APPROVED" }, select: { id: true, shopName: true, handle: true }, orderBy: { shopName: "asc" } }),
    prisma.sellerSubscription.findMany({ include: { plan: true } }),
  ]);
  const currentPlanBySellerId = Object.fromEntries(subscriptions.map((s) => [s.sellerId, s.plan.name]));

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Pricing</h1>
        <p className="text-sm text-ink-500">Change any of these and it takes effect immediately, no deploy needed. Past orders keep the rate that applied when they were placed.</p>
      </div>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">Seller plans</h2>
        <p className="mb-3 text-xs text-ink-500">
          Max active listings of 999999 represents &quot;Unlimited&quot; (Premium) in the UI. Leave it at that value rather than a smaller number unless you actually mean to cap it.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => <PlanEditForm key={plan.id} plan={plan} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">Promotion pricing</h2>
        <div className="space-y-2">
          {promotionTypes.map((pt) => <PromotionTypeEditForm key={pt.id} promotionType={pt} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">Other pricing config</h2>
        <div className="space-y-2">
          {configs.map((c) => <PricingConfigForm key={c.key} config={{ key: c.key, value: typeof c.value === "number" ? c.value : 0, description: c.description }} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">Assign a seller&apos;s plan directly</h2>
        <p className="mb-3 text-xs text-ink-500">Bypasses self-serve billing entirely, for comping a seller or fixing a mixup, not the normal upgrade path.</p>
        <SellerPlanAssignForm
          sellers={sellers}
          plans={plans.map((p) => ({ code: p.code, name: p.name }))}
          currentPlanBySellerId={currentPlanBySellerId}
        />
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">Seller limit overrides</h2>
        <p className="mb-3 text-xs text-ink-500">Reward a trusted seller with higher limits without changing their plan. Leave a field blank to fall back to their plan&apos;s normal limit.</p>
        <SellerOverrideForm
          sellers={sellers}
          existingOverrides={overrides.map((o) => ({
            sellerId: o.sellerId,
            shopName: o.seller.shopName,
            handle: o.seller.handle,
            activeListingLimitOverride: o.activeListingLimitOverride,
            monthlyListingLimitOverride: o.monthlyListingLimitOverride,
            weeklyAuctionLimitOverride: o.weeklyAuctionLimitOverride,
            activeAuctionLimitOverride: o.activeAuctionLimitOverride,
            reason: o.reason,
          }))}
        />
      </section>
    </div>
  );
}
