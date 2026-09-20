import { prisma } from "@/lib/prisma";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { CollectionRow } from "./collection-row";
import { AddCollectionForm } from "./add-collection-form";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const collections = await prisma.collection.findMany({
    orderBy: { order: "asc" },
    include: {
      products: { orderBy: { order: "asc" }, include: { product: { select: { id: true, title: true } } } },
      sellers: { orderBy: { order: "asc" }, include: { seller: { select: { id: true, shopName: true, handle: true } } } },
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Collections</h1>
      <p className="mb-6 text-sm text-ink-500">ATBP Picks, seasonal collections, and curated shop lists, shown on Explore and /picks.</p>

      {collections.length === 0 ? (
        <EmptyState icon={Sparkles} title="No collections yet" />
      ) : (
        <div className="mb-6 space-y-3">
          {collections.map((c) => (
            <CollectionRow key={c.id} collection={c} />
          ))}
        </div>
      )}

      <div className="rounded-card border border-ink-100 bg-white p-4">
        <h2 className="mb-3 font-bold text-ink-900">Create a collection</h2>
        <AddCollectionForm />
      </div>
    </div>
  );
}
