import { prisma } from "@/lib/prisma";

/** The set of product ids a user has wishlisted — one query, used to correctly
 * initialize every heart icon's state server-side instead of always starting unfilled. */
export async function getSavedProductIdSet(userId: string | undefined | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.savedProduct.findMany({ where: { userId }, select: { productId: true } });
  return new Set(rows.map((r) => r.productId));
}
