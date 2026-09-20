import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";

export interface ClaimResult {
  success: boolean;
  message: string;
  slotNumber?: number;
}

/**
 * Atomically reserves one numbered claim slot for a buyer.
 *
 * The correctness guarantee lives entirely in the `updateMany` below: it only
 * flips a slot from AVAILABLE -> CLAIMED when `status: "AVAILABLE"` still matches
 * at write time. If two buyers race for slot #27, only the first `updateMany`
 * call can match the row (SQLite serializes writers), so `result.count` tells us
 * definitively whether *this* request won the claim — no separate lock needed.
 */
export async function claimSlot(livestreamProductId: string, slotNumber: number, userId: string): Promise<ClaimResult> {
  const slot = await prisma.claimSlot.findUnique({
    where: { livestreamProductId_slotNumber: { livestreamProductId, slotNumber } },
  });
  if (!slot) return { success: false, message: "This item is no longer available." };

  const result = await prisma.claimSlot.updateMany({
    where: { id: slot.id, status: "AVAILABLE" },
    data: { status: "CLAIMED", claimedByUserId: userId, claimedAt: new Date() },
  });

  if (result.count === 0) {
    return { success: false, message: `Item #${slotNumber} was already claimed by someone else.` };
  }

  const lp = await prisma.livestreamProduct.findUnique({
    where: { id: livestreamProductId },
    include: { product: true },
  });
  if (!lp) return { success: false, message: "This item is no longer available." };

  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: lp.productId,
      quantity: 1,
      unitPrice: lp.product.price,
      sourceType: "CLAIM",
      livestreamProductId: lp.id,
      claimSlotId: slot.id,
    },
  });

  const remaining = await prisma.claimSlot.count({
    where: { livestreamProductId, status: "AVAILABLE" },
  });
  if (remaining === 0) {
    await prisma.livestreamProduct.update({ where: { id: lp.id }, data: { status: "SOLD_OUT" } });
  }

  await notify(
    userId,
    "CLAIM_SUCCESS",
    "Claimed!",
    `Item #${slotNumber}, ${lp.product.title}, has been added to your cart.`,
    "/cart"
  );

  return { success: true, message: `Item #${slotNumber} claimed! Added to your cart.`, slotNumber };
}
