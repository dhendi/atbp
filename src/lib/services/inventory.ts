import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { notifyWishlistersOfRestock, notifyWishlistersOfLowStock } from "@/lib/services/wishlist-notifications";

const LOW_STOCK_THRESHOLD = 2;

/**
 * Conditionally decrements available quantity. Because this is a single
 * `updateMany` guarded by the current quantity in its `where` clause, and
 * SQLite serializes writers, two concurrent Buy Now attempts on the last unit
 * can never both succeed — only one `updateMany` will match a row.
 */
export async function reserveInventory(productId: string, quantity: number): Promise<boolean> {
  const result = await prisma.product.updateMany({
    where: { id: productId, quantityAvailable: { gte: quantity } },
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
