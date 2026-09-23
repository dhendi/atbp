import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Handshake } from "lucide-react";
import { ServiceListingForm } from "./service-listing-form";

export const dynamic = "force-dynamic";

const SELL_SERVICE_TITLE = "Offer a Service";
const SELL_SERVICE_DESCRIPTION =
  "Offer design, writing, tutoring, editing, or other custom online work on ATBP. Delivered digitally, paid through escrow, up to 3 packages.";

export const metadata: Metadata = {
  title: SELL_SERVICE_TITLE,
  description: SELL_SERVICE_DESCRIPTION,
  openGraph: { title: SELL_SERVICE_TITLE, description: SELL_SERVICE_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: SELL_SERVICE_TITLE, description: SELL_SERVICE_DESCRIPTION },
};

export default async function SellServicePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/sell/service");

  const [seller, digitalArtCategory] = await Promise.all([
    prisma.sellerProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.category.findUnique({ where: { slug: "digital-art" } }),
  ]);
  if (seller?.status === "SUSPENDED") redirect("/sell");

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-8 md:px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Handshake size={22} />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 md:text-3xl">Offer a Service</h1>
        <p className="mt-2 text-sm text-ink-500">
          Design, writing, tutoring, editing: any custom online work. Delivered digitally, paid through escrow, up to 3 packages.
        </p>
      </div>
      <ServiceListingForm
        needsOnboarding={!seller}
        categories={digitalArtCategory ? [{ id: digitalArtCategory.id, name: digitalArtCategory.name, icon: digitalArtCategory.icon }] : []}
      />
    </div>
  );
}
