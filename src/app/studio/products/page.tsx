import Link from "next/link";
import { Plus, Package, Handshake, Download } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { ProductsList } from "./products-list";

export const dynamic = "force-dynamic";

export default async function StudioProductsPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  const products = await prisma.product.findMany({
    where: { sellerId: seller!.id, status: { not: "REMOVED" } },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-ink-900">Products</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/sell/service"><Handshake size={14} /> Offer a Service</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/sell/digital-product"><Download size={14} /> Sell a Digital Product</Link>
          </Button>
          <Button variant="brand" asChild>
            <Link href="/studio/products/new"><Plus size={16} /> Add Product</Link>
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" description="Add your first product to start selling on ATBP." />
      ) : (
        <ProductsList
          products={products.map((p) => ({
            id: p.id,
            title: p.title,
            image: (p.images as string[])[0],
            categoryIcon: p.category.icon,
            categoryName: p.category.name,
            sku: p.sku,
            price: p.price,
            quantityAvailable: p.quantityAvailable,
            quantity: p.quantity,
            status: p.status,
            listingType: p.listingType,
            featured: p.featured,
          }))}
        />
      )}
    </div>
  );
}
