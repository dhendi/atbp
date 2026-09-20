import { prisma } from "@/lib/prisma";
import { effectivePrice } from "@/lib/deals";

export async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
}

export async function getCartWithItems(userId: string) {
  const cart = await getOrCreateCart(userId);
  return prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: { include: { seller: true } } },
    orderBy: { addedAt: "desc" },
  });
}

export async function addToCart(userId: string, productId: string, quantity = 1, personalizationNote?: string) {
  const cart = await getOrCreateCart(userId);
  // findUnique + explicit check, not findUniqueOrThrow — that throws a
  // PrismaClientKnownRequestError whose message names the model/query
  // internals, and addToCartAction passes caught error messages straight
  // back to the client.
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("This item is no longer available.");
  if (product.listingType === "AUCTION") {
    throw new Error("Auction items can't be added to cart. Place a bid instead.");
  }
  if (product.status !== "ACTIVE") {
    throw new Error("This item is no longer available.");
  }

  // A personalized item is inherently distinct per note, so it always gets its
  // own cart row rather than merging quantity into an existing (differently
  // personalized) line for the same product.
  const existing = !personalizationNote
    ? await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId, sourceType: "MARKETPLACE", personalizationNote: null } })
    : null;
  if (existing) {
    return prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
  }
  return prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity, unitPrice: effectivePrice(product), sourceType: "MARKETPLACE", personalizationNote },
  });
}

export async function removeCartItem(userId: string, cartItemId: string) {
  const cart = await getOrCreateCart(userId);
  return prisma.cartItem.deleteMany({ where: { id: cartItemId, cartId: cart.id } });
}

/** Moves a cart item to the wishlist instead of discarding it outright —
 * reuses SavedProduct (the same list behind the heart icon and /saved) rather
 * than introducing a second, parallel "saved for later" list. */
export async function saveCartItemForLater(userId: string, cartItemId: string) {
  const cart = await getOrCreateCart(userId);
  const item = await prisma.cartItem.findFirst({ where: { id: cartItemId, cartId: cart.id }, include: { product: true } });
  if (!item) return { error: "Item not found in your cart." };

  const existingSave = await prisma.savedProduct.findUnique({ where: { userId_productId: { userId, productId: item.productId } } });
  await prisma.savedProduct.upsert({
    where: { userId_productId: { userId, productId: item.productId } },
    update: {},
    create: { userId, productId: item.productId, priceAtSave: effectivePrice(item.product) },
  });
  if (!existingSave) await prisma.product.update({ where: { id: item.productId }, data: { likeCount: { increment: 1 } } });
  await prisma.cartItem.delete({ where: { id: item.id } });
  return { success: true };
}

/** The inverse of saveCartItemForLater — moves a wishlisted item back into the cart. */
export async function moveSavedToCart(userId: string, productId: string, quantity = 1) {
  await addToCart(userId, productId, quantity);
  const saved = await prisma.savedProduct.findUnique({ where: { userId_productId: { userId, productId } } });
  if (saved) {
    await prisma.savedProduct.delete({ where: { id: saved.id } });
    await prisma.product.update({ where: { id: productId }, data: { likeCount: { decrement: 1 } } });
  }
}

export async function updateCartItemQuantity(userId: string, cartItemId: string, quantity: number) {
  const cart = await getOrCreateCart(userId);
  if (quantity <= 0) return removeCartItem(userId, cartItemId);
  return prisma.cartItem.updateMany({ where: { id: cartItemId, cartId: cart.id }, data: { quantity } });
}
