import type { Metadata } from "next";
import { cachedQuery } from "@/lib/cache";
import Link from "next/link";
import { Check, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/domain/section-header";
import { PremiumSavingsCalculator } from "@/components/domain/premium-savings-calculator";
import { FoundingPremiumComparison } from "@/components/domain/founding-premium-comparison";
import { CARD_PROCESSING_FEE } from "@/lib/services/commission";
import { getFoundingSellerAvailability } from "@/lib/services/founding-seller";
import { formatPeso } from "@/lib/utils";

// The shared (main) layout reads the area cookie for the nav, which forces
// every page under it to render dynamically regardless of this page's own
// revalidate/dynamic export — so the plan list is cached at the query level
// instead, which works independent of the page's own render mode.
const getSellerPlans = cachedQuery(
  async () => prisma.sellerPlan.findMany({ orderBy: { monthlyPrice: "asc" } }),
  ["seller-plans"],
  { revalidate: 60, tags: ["seller-plans"] }
);

const PRICING_TITLE = "Seller Pricing";
const PRICING_DESCRIPTION =
  "Compare ATBP seller plans: Free, Pro, and Premium. Sell for a simple 10% commission (8% on Premium), no listing fees, plus perks for Founding Sellers.";

export const metadata: Metadata = {
  title: PRICING_TITLE,
  description: PRICING_DESCRIPTION,
  openGraph: { title: PRICING_TITLE, description: PRICING_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: PRICING_TITLE, description: PRICING_DESCRIPTION },
};

export default async function PricingPage() {
  const [plans, foundingAvailability] = await Promise.all([getSellerPlans(), getFoundingSellerAvailability()]);
  const [freePlan, proPlan, premiumPlan] = ["FREE", "PRO", "PREMIUM"].map((code) => plans.find((p) => p.code === code));
  if (!freePlan || !proPlan || !premiumPlan) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 pt-4 pb-16 md:px-6">
      <SectionHeader
        as="h1"
        eyebrow="For sellers"
        title="Sell on ATBP for a simple 10% commission"
        subtitle="10% marketplace commission, or 8% on Premium. Card and Online Banking orders also carry a flat ₱15 processing fee per order, charged to the seller. No listing fees, no signup cost. ATBP only makes money when you do."
      />

      <FoundingSellerSection availability={foundingAvailability} />

      <div className="grid gap-4 md:grid-cols-3">
        <PlanCard
          name="Free" tagline="Start selling"
          price="₱0" priceSuffix="/month"
          fee={`${freePlan.transactionFeePercent}% commission`}
          features={[
            `${freePlan.maxActiveListings} active listings`,
            "Basic seller analytics",
            "Basic storefront customization",
            "Basic sales & order tracking",
            "Customer reviews & ratings",
            "Standard seller support",
          ]}
          cta="Start Selling" href="/sell"
        />
        <PlanCard
          name="Pro" tagline="Grow your shop"
          price={formatPeso(proPlan.monthlyPrice)} priceSuffix="/month"
          fee={`${proPlan.transactionFeePercent}% commission`}
          features={[
            `${proPlan.maxActiveListings} active listings`,
            "Everything in Free",
            "Advanced seller analytics",
            "Enhanced storefront customization",
            "Promotional / Boost tools",
            "Bulk listing tools",
            "Priority seller support",
          ]}
          cta="Upgrade to Pro" href="/studio/plan"
        />
        <PlanCard
          highlight
          name="Premium" tagline="Scale your business"
          price={formatPeso(premiumPlan.monthlyPrice)} priceSuffix="/month"
          fee={`${premiumPlan.transactionFeePercent}% commission`}
          features={[
            "Unlimited active listings",
            "Everything in Pro",
            "Advanced analytics & deeper insights",
            "Advanced storefront customization",
            "Advanced promotional tools",
            "High-volume seller tools",
            "Priority support",
          ]}
          cta="Upgrade to Premium" href="/studio/plan"
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-white p-6 text-center">
        <p className="font-display text-lg font-semibold text-ink-900">10 listings → 250 listings → Unlimited listings</p>
        <p className="mt-1 text-sm text-ink-500">10% commission → 10% commission → 8% commission</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-600">
          Free gets you started with up to 10 products. Pro grows your shop to 250 products with advanced seller tools. Premium removes the listing limit entirely, unlocks the most advanced tools, and lowers your commission from 10% to 8%.
        </p>
      </div>

      <div>
        <h2 className="mb-1 font-display text-xl font-semibold text-ink-900">Premium may make more sense as your shop grows</h2>
        <p className="mb-4 text-sm text-ink-500">Premium&apos;s 8% commission becomes more valuable the more you sell. See where it starts paying off for you.</p>
        <PremiumSavingsCalculator defaultMonthlySales={100_000} />
      </div>

      {!foundingAvailability.full && (
        <div>
          <h2 className="mb-1 font-display text-xl font-semibold text-ink-900">Founding Sellers get a lower Premium price</h2>
          <p className="mb-4 text-sm text-ink-500">The exclusive Founding Premium price, available after your free 1-year Pro period.</p>
          <FoundingPremiumComparison />
        </div>
      )}

      <div className="rounded-card border border-ink-100 bg-white p-5 text-sm text-ink-600">
        <p className="font-bold text-ink-900">Payment processing</p>
        <p className="mt-1">
          When a buyer pays with GCash, Maya, or QR Ph, there&apos;s no fee beyond your plan&apos;s commission. Card and Online Banking payments carry one additional flat fee of {formatPeso(CARD_PROCESSING_FEE)} per order. It&apos;s not a percentage, and it&apos;s the same {formatPeso(CARD_PROCESSING_FEE)} whether the order is ₱200 or ₱20,000.
        </p>
      </div>

      <p className="text-center text-xs text-ink-400">
        Have more products to sell than your plan allows? <Link href="/studio/plan" className="font-semibold text-brand-600 hover:underline">Upgrade any time from Studio &gt; Plan &amp; Billing</Link>. You only pay for the month, no lock-in.
      </p>
    </div>
  );
}

function FoundingSellerSection({ availability }: { availability: { claimed: number; limit: number; remaining: number; full: boolean } }) {
  return (
    <div className="relative overflow-hidden rounded-card border border-amber-300 bg-gradient-to-br from-amber-50 via-amber-50 to-white p-6 md:p-8">
      <div className="paper-grain absolute inset-0" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white">
          <Trophy size={12} /> Founding 200
        </span>
        <h2 className="font-display mt-3 text-2xl font-semibold text-ink-900 md:text-3xl">
          We&apos;re rewarding the first 200 sellers who help build ATBP.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-700 md:text-base">
          8% commission + FREE Pro for 1 year. Then unlock Founding Premium for just ₱999/month.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:max-w-xl">
          <MiniBenefit label="8% commission" />
          <MiniBenefit label="FREE Pro for 1 year" />
          <MiniBenefit label="Founding Premium: ₱999/mo" />
        </div>

        <div className="mt-5 rounded-2xl border border-amber-300 bg-white/70 p-4 sm:max-w-md">
          <p className="text-sm font-bold text-ink-900">After your free Pro period</p>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-ink-500">Founding Premium</span>
            <span className="font-bold text-amber-800">{formatPeso(999)}/mo · 8% commission</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-ink-500">Compared with normal Premium</span>
            <span className="text-ink-500 line-through decoration-ink-300">{formatPeso(1999)}/mo · 8% commission</span>
          </div>
          <p className="mt-2 text-xs text-ink-500">Same commission as standard Premium. The founding rate is a lower monthly fee, not a lower cut.</p>
        </div>

        <p className="mt-4 max-w-2xl text-xs font-semibold text-ink-600">
          Only open to registered businesses with a valid BIR Certificate of Registration, verified by our team during approval. Casual and individual sellers are always welcome on ATBP, just not eligible for Founding Seller benefits.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {availability.full ? (
            <span className="rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white">Founding 200 is now full</span>
          ) : (
            <Button asChild variant="gold" size="lg">
              <Link href="/sell">Become a Founding Seller</Link>
            </Button>
          )}
          <a href="#founding-details" className="text-sm font-bold text-amber-800 hover:underline">
            View Founding benefits
          </a>
        </div>

        <p className="mt-3 text-sm font-semibold text-ink-700">
          {availability.full ? "Founding 200 is now full" : `Only 200 spots available: ${availability.remaining} / ${availability.limit} remaining`}
        </p>

        <details id="founding-details" className="group mt-5 max-w-2xl">
          <summary className="cursor-pointer text-sm font-bold text-amber-800">Full Founding Seller terms</summary>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-700">
            <li>• Only open to registered businesses with a valid BIR Certificate of Registration, verified by our team, not individual/casual sellers.</li>
            <li>• Only the first 200 approved, BIR-verified businesses qualify. Applications and pending accounts don&apos;t count until both are done.</li>
            <li>• 8% commission and a free Pro plan (normally ₱699/month) for your first year, starting the day you&apos;re approved and verified.</li>
            <li>• You still get the normal Pro limit of 250 active listings during this period, not unlimited.</li>
            <li>• After 1 year, choose standard Free/Pro or switch to Founding Premium: ₱999/month (discounted from the standard ₱1,999/month), unlimited listings, same 8% commission as standard Premium.</li>
            <li>• Founding Seller status and badge are permanent, even if you later downgrade.</li>
            <li>• Subject to admin approval of your seller application and verification of your BIR registration.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}

function MiniBenefit({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-ink-800">
      <Check size={15} className="shrink-0 text-amber-700" /> {label}
    </div>
  );
}

function PlanCard({
  name, tagline, price, priceSuffix, fee, features, cta, href, highlight,
}: { name: string; tagline: string; price: string; priceSuffix: string; fee: string; features: string[]; cta: string; href: string; highlight?: boolean }) {
  return (
    <div className={`relative rounded-card border p-5 ${highlight ? "border-gold-400 bg-gold-50 shadow-lg md:scale-105" : "border-ink-100 bg-white"}`}>
      {highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-3 py-1 text-[11px] font-bold text-white">
          Best value
        </span>
      )}
      <p className="font-bold text-ink-900">{name}</p>
      <p className="text-sm text-ink-500">{tagline}</p>
      <p className="font-display mt-2 text-3xl font-semibold text-ink-900">
        {price}<span className="text-base font-normal text-ink-500">{priceSuffix}</span>
      </p>
      <p className="text-sm font-semibold text-brand-600">{fee}</p>
      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-ink-700">
            <Check size={15} className="mt-0.5 shrink-0 text-brand-500" /> {f}
          </li>
        ))}
      </ul>
      <Button asChild variant={highlight ? "gold" : "outline"} className="mt-5 w-full">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
