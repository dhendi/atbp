import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Boxes } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { InventoryRow } from "./inventory-row";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  const products = await prisma.product.findMany({
    where: { sellerId: seller!.id, status: { not: "REMOVED" } },
    orderBy: { quantityAvailable: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Inventory</h1>
      {products.length === 0 ? (
        <EmptyState icon={Boxes} title="No products yet" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs font-bold uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Total Qty</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <InventoryRow key={p.id} product={{ id: p.id, title: p.title, sku: p.sku, quantity: p.quantity, quantityAvailable: p.quantityAvailable, status: p.status }} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
