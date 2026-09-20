import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";

/** Notifies everyone who wishlisted a product that it's back in stock. Call
 * only at the exact out-of-stock → in-stock transition so this fires once per restock. */
export async function notifyWishlistersOfRestock(productId: string) {
  const saves = await prisma.savedProduct.findMany({
    where: { productId, user: { notifyWishlistRestock: true } },
    include: { product: true },
  });
  await Promise.all(
    saves.map((s) =>
      notify(
        s.userId,
        "BACK_IN_STOCK",
        "Back in stock",
        `"${s.product.title}" is back in stock, so grab it before it sells out again.`,
        `/product/${productId}`
      )
    )
  );
}

/** Notifies wishlisters for whom the new effective price is a real drop below
 * what they saw when they saved it. Call only when price actually just decreased. */
export async function notifyWishlistersOfPriceDrop(productId: string, newEffectivePrice: number) {
  const saves = await prisma.savedProduct.findMany({
    where: { productId, priceAtSave: { gt: newEffectivePrice }, user: { notifyWishlistPriceDrop: true } },
    include: { product: true },
  });
  await Promise.all(
    saves.map((s) =>
      notify(
        s.userId,
        "PRICE_CHANGE",
        "Price drop on your wishlist",
        `"${s.product.title}" dropped to ₱${newEffectivePrice.toLocaleString()}, down from ₱${s.priceAtSave!.toLocaleString()}.`,
        `/product/${productId}`
      )
    )
  );
}

/** Notifies wishlisters that a saved item is running low. Call only at the
 * crossing into the low-stock zone (not on every subsequent unit sold), so
 * this fires once per product per low-stock episode. */
export async function notifyWishlistersOfLowStock(productId: string, quantityAvailable: number) {
  const saves = await prisma.savedProduct.findMany({
    where: { productId, user: { notifyWishlistLowStock: true } },
    include: { product: true },
  });
  await Promise.all(
    saves.map((s) =>
      notify(
        s.userId,
        "LOW_STOCK",
        "Running low",
        `Only ${quantityAvailable} left of "${s.product.title}", an item on your wishlist.`,
        `/product/${productId}`
      )
    )
  );
}
