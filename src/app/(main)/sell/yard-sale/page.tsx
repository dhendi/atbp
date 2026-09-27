import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Tent } from "lucide-react";
import { getLeafCategories } from "@/lib/categories";
import { YardSaleOnboardingForm } from "./yard-sale-onboarding-form";

export const dynamic = "force-dynamic";

const SELL_YARD_SALE_TITLE = "Start My Yard Sale";
const SELL_YARD_SALE_DESCRIPTION =
  "Run a time-boxed Yard Sale on ATBP, from 1 day to 1 month, to clear out a bunch of items at once. It closes automatically when it ends.";

export const metadata: Metadata = {
  title: SELL_YARD_SALE_TITLE,
  description: SELL_YARD_SALE_DESCRIPTION,
  openGraph: { title: SELL_YARD_SALE_TITLE, description: SELL_YARD_SALE_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: SELL_YARD_SALE_TITLE, description: SELL_YARD_SALE_DESCRIPTION },
};

export default async function SellYardSalePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/sell/yard-sale");

  const existingProfile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (existingProfile) redirect("/sell");

  const leafCategories = await getLeafCategories();

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-8 md:px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Tent size={22} />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 md:text-3xl">Start My Yard Sale</h1>
        <p className="mt-2 text-sm text-ink-500">
          A time-boxed clear-out: 1 day up to 1 month. It closes automatically when it ends.
        </p>
      </div>
      <YardSaleOnboardingForm categories={leafCategories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))} />
    </div>
  );
}
