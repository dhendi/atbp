import { prisma } from "@/lib/prisma";

// No cache invalidation in here: updateTag only works inside a server action,
// and the daily job / admin page also call this. Server actions that call it
// invalidate the tags themselves (cached shelves also refresh within a minute).
//
// Not a "use server" module: exports here take a sellerId and change what's
// visible on the whole site, so they're only called from actions that have
// already checked for an admin.

/** Listing status held while its shop is suspended. Every public query only
 * shows ACTIVE products, so this hides them everywhere at once, and
 * restoreSellerListings puts back exactly the ones this hid. */
export const SELLER_SUSPENDED_STATUS = "SELLER_SUSPENDED";

/** Pulls every live listing of currently suspended shops off the site. With no
 * sellerId it sweeps all suspended shops, which is what the daily job and the
 * admin Sellers page use to catch any that were suspended before this existed
 * or by another path. */
export async function hideSuspendedSellerListings(sellerId?: string) {
  const res = await prisma.product.updateMany({
    where: { status: "ACTIVE", seller: { status: "SUSPENDED", ...(sellerId ? { id: sellerId } : {}) } },
    data: { status: SELLER_SUSPENDED_STATUS },
  });
  return res.count;
}

export async function restoreSellerListings(sellerId: string) {
  const res = await prisma.product.updateMany({
    where: { sellerId, status: SELLER_SUSPENDED_STATUS },
    data: { status: "ACTIVE" },
  });
  return res.count;
}
