import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shirt } from "lucide-react";
import { getLeafCategories } from "@/lib/categories";
import { ClosetOnboardingForm } from "./closet-onboarding-form";

export const dynamic = "force-dynamic";

const SELL_CLOSET_TITLE = "Open My Closet";
const SELL_CLOSET_DESCRIPTION =
  "Sell things you already own on ATBP with My Closet: up to 20 active items, no monthly subscription, and instant approval to start selling.";

export const metadata: Metadata = {
  title: SELL_CLOSET_TITLE,
  description: SELL_CLOSET_DESCRIPTION,
  openGraph: { title: SELL_CLOSET_TITLE, description: SELL_CLOSET_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: SELL_CLOSET_TITLE, description: SELL_CLOSET_DESCRIPTION },
};

// A Closet is a person clearing out what they own, so the "what do you
// primarily sell" list is just the everyday things people actually part with.
// Anything else (shoes, say) can still be typed in as their own tag.
const CLOSET_CATEGORY_SLUGS = new Set(["fashion", "streetwear", "bags", "jewelry", "beauty", "vintage", "pre-loved", "baby-kids", "books"]);

export default async function SellClosetPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/sell/closet");

  const existingProfile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (existingProfile) redirect("/sell");

  const leafCategories = await getLeafCategories();

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-8 md:px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Shirt size={22} />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 md:text-3xl">Open My Closet</h1>
        <p className="mt-2 text-sm text-ink-500">
          Sell things you already own, whenever you want. Up to 20 active items, no monthly subscription, approved instantly.
        </p>
      </div>
      <ClosetOnboardingForm categories={leafCategories.filter((c) => CLOSET_CATEGORY_SLUGS.has(c.slug)).map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))} />
    </div>
  );
}
