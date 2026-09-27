import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sparkles, TrendingUp, ShieldCheck, Trophy, Check } from "lucide-react";
import { getFoundingSellerAvailability } from "@/lib/services/founding-seller";
import { getLeafCategories } from "@/lib/categories";
import { SellForm } from "./sell-form";

export const dynamic = "force-dynamic";

const SELL_SHOP_TITLE = "Open Your Shop";
const SELL_SHOP_DESCRIPTION =
  "Open an ongoing shop on ATBP: list products, track real analytics, and get paid securely. Requires BIR verification and admin approval.";

export const metadata: Metadata = {
  title: SELL_SHOP_TITLE,
  description: SELL_SHOP_DESCRIPTION,
  openGraph: { title: SELL_SHOP_TITLE, description: SELL_SHOP_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: SELL_SHOP_TITLE, description: SELL_SHOP_DESCRIPTION },
};

export default async function SellShopPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/sell/shop");

  const existingProfile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (existingProfile) redirect("/sell");

  const [foundingAvailability, leafCategories] = await Promise.all([getFoundingSellerAvailability(), getLeafCategories()]);

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-8 md:px-6">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink-900 md:text-3xl">Open your shop</h1>
        <p className="mt-2 text-sm text-ink-500">List your products, track sales, and manage orders, all in one place.</p>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3 text-center">
        <Feature icon={Sparkles} label="List in minutes" />
        <Feature icon={TrendingUp} label="Track real analytics" />
        <Feature icon={ShieldCheck} label="Get paid securely" />
      </div>

      <div className="mb-6 rounded-card border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
        My Shop requires BIR verification. You&apos;ll need a BIR Certificate of Registration to get approved. If you&apos;re not
        registered yet, My Closet or My Yard Sale might be a better fit for now.
      </div>

      {foundingAvailability && !foundingAvailability.full && (
        <div className="mb-8 rounded-card border border-amber-300 bg-amber-50 p-5">
          <p className="font-display text-lg font-semibold text-ink-900">🎉 You could be one of the first 200</p>
          <p className="mt-1 text-sm text-ink-700">Join ATBP as a Founding Seller and receive:</p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-800">
            <li className="flex items-center gap-2"><Check size={14} className="shrink-0 text-amber-700" /> 8% commission</li>
            <li className="flex items-center gap-2"><Check size={14} className="shrink-0 text-amber-700" /> FREE Pro for 1 year</li>
            <li className="flex items-center gap-2"><Check size={14} className="shrink-0 text-amber-700" /> Permanent Founding Seller status</li>
            <li className="flex items-center gap-2"><Check size={14} className="shrink-0 text-amber-700" /> Exclusive Premium price: ₱999/month (vs. ₱1,999/month standard)</li>
          </ul>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <Trophy size={13} /> Only {foundingAvailability.remaining} of {foundingAvailability.limit} spots available
          </p>
          <p className="mt-2 text-[11px] text-ink-500">
            Only open to registered businesses with a valid BIR Certificate of Registration, verified during approval. Applying is subject to admin review.
          </p>
        </div>
      )}

      <SellForm categories={leafCategories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))} />
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Sparkles; label: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3">
      <Icon className="mx-auto mb-1.5 text-brand-500" size={20} />
      <p className="text-xs font-semibold text-ink-600">{label}</p>
    </div>
  );
}
