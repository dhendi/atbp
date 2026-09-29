import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LAUNCH_HIDDEN_CATEGORY_SLUGS } from "@/lib/feature-flags";

/** GET /api/v1/categories — the same parent/child tree CategoriesMenu
 * renders on the web (src/components/domain/categories-menu.tsx), as JSON. */
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true, icon: true, parentId: true },
  });
  const bySlugVisible = categories.filter((c) => !LAUNCH_HIDDEN_CATEGORY_SLUGS.has(c.slug));
  const parents = bySlugVisible.filter((c) => !c.parentId);
  const tree = parents.map((p) => ({
    ...p,
    children: bySlugVisible.filter((c) => c.parentId === p.id),
  }));
  return NextResponse.json({ categories: tree });
}
