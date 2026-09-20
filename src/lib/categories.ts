import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const WITH_CHILDREN = { children: { orderBy: { order: "asc" as const } } } satisfies Prisma.CategoryInclude;
export type CategoryWithChildren = Prisma.CategoryGetPayload<{ include: typeof WITH_CHILDREN }>;

/** Top-level categories only, each with its children — the shape every
 * "Browse Categories" chip row and category filter should be built from,
 * so the UI never shows the full flat list of ~30 leaf categories at once. */
export async function getCategoriesWithChildren(): Promise<CategoryWithChildren[]> {
  return prisma.category.findMany({ where: { parentId: null }, orderBy: { order: "asc" }, include: WITH_CHILDREN });
}

/** Leaf categories only (with their parent's name for context) — what a
 * seller actually assigns a product to, or a buyer posts a "looking for" under. */
export async function getLeafCategories() {
  return prisma.category.findMany({
    where: { parentId: { not: null } },
    orderBy: { order: "asc" },
    include: { parent: true },
  });
}

/** Resolves a category slug (parent OR leaf) to the full set of categoryIds a
 * product filter should match: a parent expands to itself + every child, a
 * leaf resolves to just itself. Returns null if the slug matches nothing —
 * callers should leave the categoryId filter off in that case. */
export function resolveCategoryIds(slug: string, categories: CategoryWithChildren[]): string[] | null {
  for (const cat of categories) {
    if (cat.slug === slug) return cat.children.length > 0 ? [cat.id, ...cat.children.map((c) => c.id)] : [cat.id];
    const child = cat.children.find((c) => c.slug === slug);
    if (child) return [child.id];
  }
  return null;
}
