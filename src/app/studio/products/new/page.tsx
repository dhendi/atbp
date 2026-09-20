import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeafCategories } from "@/lib/categories";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const session = await auth();
  const [categories, seller] = await Promise.all([
    getLeafCategories(),
    prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Add Product</h1>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: `${c.parent!.name} › ${c.name}`, icon: c.icon }))}
        sellerLocalDeliveryAreas={(seller?.localDeliveryAreas as string[]) ?? []}
      />
    </div>
  );
}
