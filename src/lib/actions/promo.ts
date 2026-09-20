"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tryApplyPromoCode } from "@/lib/services/promo";
import { checkRateLimit } from "@/lib/services/rate-limit";

/** Previews whether a promo code would actually apply to the buyer's current
 * checkout selection, without redeeming it — so buyers see "valid" or "not
 * valid" before placing the order instead of only finding out after. */
export async function validatePromoCodeAction(cartItemIds: string[], code: string) {
  const session = await auth();
  if (!session?.user) return { valid: false as const, message: "Please log in first." };
  if (!code.trim()) return { valid: false as const, message: "Enter a code." };
  if (!(await checkRateLimit(`promo:${session.user.id}`, 15, 60_000))) {
    return { valid: false as const, message: "Too many attempts. Please wait a moment." };
  }

  const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } });
  if (!cart) return { valid: false as const, message: "Cart not found." };

  const items = await prisma.cartItem.findMany({
    where: { id: { in: cartItemIds }, cartId: cart.id },
    include: { product: { select: { sellerId: true } } },
  });
  if (items.length === 0) return { valid: false as const, message: "No items selected." };

  const subtotalBySeller = new Map<string, number>();
  for (const item of items) {
    subtotalBySeller.set(item.product.sellerId, (subtotalBySeller.get(item.product.sellerId) ?? 0) + item.unitPrice * item.quantity);
  }

  let discountAmount = 0;
  let matched = false;
  for (const [sellerId, subtotal] of subtotalBySeller) {
    const promo = await tryApplyPromoCode(code, sellerId, subtotal, session.user.id);
    if (promo) {
      discountAmount += promo.discountAmount;
      matched = true;
    }
  }

  if (!matched) return { valid: false as const, message: "This code isn't valid for these items." };
  return { valid: true as const, discountAmount, message: "Code applied" };
}
