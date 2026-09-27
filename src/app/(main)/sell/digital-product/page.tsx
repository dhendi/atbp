import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Download } from "lucide-react";
import { getCategoriesWithChildren } from "@/lib/categories";
import { DigitalProductListingForm } from "./digital-product-listing-form";

export const dynamic = "force-dynamic";

const SELL_DIGITAL_PRODUCT_TITLE = "Sell a Digital Product";
const SELL_DIGITAL_PRODUCT_DESCRIPTION =
  "Sell templates, presets, ebooks, STL files, fonts, and more on ATBP. Upload once, and buyers get an instant, secure download after payment.";

export const metadata: Metadata = {
  title: SELL_DIGITAL_PRODUCT_TITLE,
  description: SELL_DIGITAL_PRODUCT_DESCRIPTION,
  openGraph: { title: SELL_DIGITAL_PRODUCT_TITLE, description: SELL_DIGITAL_PRODUCT_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: SELL_DIGITAL_PRODUCT_TITLE, description: SELL_DIGITAL_PRODUCT_DESCRIPTION },
};

export default async function SellDigitalProductPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/sell/digital-product");

  const [seller, categoryGroups, digitalArtCategory] = await Promise.all([
    prisma.sellerProfile.findUnique({ where: { userId: session.user.id } }),
    getCategoriesWithChildren(),
    prisma.category.findUnique({ where: { slug: "digital-art" } }),
  ]);
  if (seller?.status === "SUSPENDED") redirect("/sell");

  const digitalProducts = categoryGroups.find((g) => g.slug === "digital-products");
  // Digital Art now lives under Handmade & Art (it's shared with Services'
  // Illustration & Art Commissions — see prisma/seed.ts), not under Digital
  // Products, but a digital-download art file is still exactly the kind of
  // thing this form lists, so it's offered here too.
  const categoryOptions = [
    ...(digitalArtCategory ? [digitalArtCategory] : []),
    ...(digitalProducts?.children ?? []),
  ];

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-8 md:px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Download size={22} />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 md:text-3xl">Sell a Digital Product</h1>
        <p className="mt-2 text-sm text-ink-500">
          Templates, presets, ebooks, STL files, fonts, and more. Upload once, and buyers get an instant, secure download after payment.
        </p>
      </div>
      <DigitalProductListingForm
        needsOnboarding={!seller}
        categories={categoryOptions.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
      />
    </div>
  );
}
