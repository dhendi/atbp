import { notFound } from "next/navigation";
import Link from "next/link";
import { Gavel } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ProductForm } from "../../product-form";
import { getLeafCategories } from "@/lib/categories";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });

  const [leafCategories, product] = await Promise.all([
    getLeafCategories(),
    prisma.product.findFirst({ where: { id, sellerId: seller!.id } }),
  ]);
  const categories = leafCategories.map((c) => ({ id: c.id, name: `${c.parent!.name} › ${c.name}`, icon: c.icon }));
  if (!product) notFound();

  if (product.listingType === "AUCTION") {
    return (
      <div className="max-w-lg rounded-card border border-ink-200 bg-white p-6 text-center">
        <Gavel size={28} className="mx-auto text-brand-600" />
        <h1 className="mt-3 text-lg font-bold text-ink-900">Auction listings can&apos;t be edited</h1>
        <p className="mt-1 text-sm text-ink-500">
          Once an auction is live, its details are locked so bidders can trust what they&apos;re bidding on. You can still end it early if needed.
        </p>
        <Button asChild variant="brand" className="mt-4">
          <Link href="/studio/auctions">Go to Auctions</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Edit Product</h1>
      <ProductForm
        categories={categories}
        productId={product.id}
        sellerLocalDeliveryAreas={(seller?.localDeliveryAreas as string[]) ?? []}
        initial={{
          title: product.title,
          description: product.description,
          images: product.images as string[],
          videoUrl: product.videoUrl,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          quantity: product.quantity,
          categoryId: product.categoryId,
          type: product.type,
          condition: product.condition,
          sku: product.sku ?? "",
          shippingInfo: product.shippingInfo ?? "",
          sellingModes: product.sellingModes as string[],
          status: product.status,
          listingType: product.listingType,
          dealPrice: product.dealPrice,
          dealStartAt: product.dealStartAt?.toISOString() ?? null,
          dealEndAt: product.dealEndAt?.toISOString() ?? null,
          shippingAvailable: product.shippingAvailable,
          pickupAvailable: product.pickupAvailable,
          localDeliveryAvailable: product.localDeliveryAvailable,
          localDeliveryAreas: product.localDeliveryAreas as string[] | null,
          isDigital: product.isDigital,
          digitalFileUrl: product.digitalFileUrl,
          digitalDeliveryInstructions: product.digitalDeliveryInstructions,
          madeToOrder: product.madeToOrder,
          productionTimeDays: product.productionTimeDays,
          customizationOptions: product.customizationOptions as string[],
          personalizationInstructions: product.personalizationInstructions,
          maxOrderQuantity: product.maxOrderQuantity,
          isFood: product.isFood,
          shelfStable: product.shelfStable,
          expiryInfo: product.expiryInfo,
          ingredients: product.ingredients,
          allergens: product.allergens,
          foodShippingNotes: product.foodShippingNotes,
        }}
      />
    </div>
  );
}
