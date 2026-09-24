import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { notifyWishlistersOfRestock, notifyWishlistersOfLowStock } from "@/lib/services/wishlist-notifications";

const LOW_STOCK_THRESHOLD = 2;

/**
 * Conditionally decrements available quantity. This is a single atomic
 * `updateMany` guarded by the current quantity in its `where` clause — on
 * Postgres, the UPDATE takes a row lock, so a second concurrent call blocks
 * until the first commits, then re-evaluates `quantityAvailable: { gte }`
 * against the now-decremented value. Two concurrent Buy Now attempts on the
 * last unit can never both succeed: only one `updateMany` will match the row.
 */
export async function reserveInventory(productId: string, quantity: number): Promise<boolean> {
  // A negative quantity would satisfy `quantityAvailable >= quantity` and then
  // *increment* stock via the negative decrement, so only positive whole
  // numbers are ever accepted here.
  if (!Number.isInteger(quantity) || quantity < 1) return false;
  const result = await prisma.product.updateMany({
    // Only a live listing can be reserved (an admin-flagged/removed one must
    // never be flipped to SOLD_OUT or sold).
    where: { id: productId, status: "ACTIVE", quantityAvailable: { gte: quantity } },
    data: { quantityAvailable: { decrement: quantity } },
  });
  if (result.count === 1) {
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { seller: true } });
    if (product && product.quantityAvailable <= 0) {
      await prisma.product.update({ where: { id: productId }, data: { status: "SOLD_OUT" } });
    } else if (product && product.quantityAvailable <= LOW_STOCK_THRESHOLD) {
      await notify(
        product.seller.userId,
        "LOW_STOCK",
        "Low stock alert",
        `"${product.title}" only has ${product.quantityAvailable} left. Restock soon to avoid selling out.`,
        `/studio/products/${product.id}/edit`
      );
      // Only the crossing into the low-stock zone, not every unit sold within it.
      const preQuantity = product.quantityAvailable + quantity;
      if (preQuantity > LOW_STOCK_THRESHOLD) {
        await notifyWishlistersOfLowStock(productId, product.quantityAvailable);
      }
    }
    return true;
  }
  return false;
}

export async function releaseInventory(productId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) return;
  await prisma.product.updateMany({
    where: { id: productId },
    data: { quantityAvailable: { increment: quantity } },
  });
  const restocked = await prisma.product.updateMany({
    where: { id: productId, status: "SOLD_OUT" },
    data: { status: "ACTIVE" },
  });
  if (restocked.count > 0) await notifyWishlistersOfRestock(productId);
}
