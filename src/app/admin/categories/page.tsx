import { prisma } from "@/lib/prisma";
import { CategoryManager } from "./category-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" }, include: { parent: true } });
  const productCounts = await prisma.product.groupBy({ by: ["categoryId"], _count: true });
  const countMap = Object.fromEntries(productCounts.map((c) => [c.categoryId, c._count]));
  const childCounts = await prisma.category.groupBy({ by: ["parentId"], _count: true });
  const childCountMap = Object.fromEntries(childCounts.filter((c) => c.parentId).map((c) => [c.parentId as string, c._count]));
  const topLevel = categories.filter((c) => !c.parentId);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Categories</h1>
      <p className="mb-4 max-w-xl text-sm text-ink-500">
        New categories are added as top-level. Rename, re-icon, or nest one under a top-level parent directly below.
      </p>
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id, name: c.name, slug: c.slug, icon: c.icon, parentId: c.parentId,
          productCount: countMap[c.id] ?? 0, childCount: childCountMap[c.id] ?? 0, parentName: c.parent?.name ?? null,
        }))}
        topLevelOptions={topLevel.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
