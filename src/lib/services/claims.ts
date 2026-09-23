import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { reserveInventory } from "@/lib/services/inventory";

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
  if (!lp) {
    await revertClaim(slot.id);
    return { success: false, message: "This item is no longer available." };
  }

  // A livestream product is still the same Product sold through the regular
  // marketplace and BUY_NOW at the same time — winning a numbered slot here
  // doesn't by itself stop someone else buying the last real unit through
  // another channel unless this also reserves it, the same way BUY_NOW
  // reserves stock the moment it's added to a cart. Without this, two buyers
  // could each walk away thinking they own the same physical last unit.
  const reserved = await reserveInventory(lp.productId, 1);
  if (!reserved) {
    await revertClaim(slot.id);
    return { success: false, message: "This item just sold out." };
  }

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

/** Puts a slot back to AVAILABLE — used when claimSlot has to bail out after
 * already winning the CLAIMED flip (the livestream product vanished, or the
 * underlying stock is actually gone), so the slot doesn't stay stuck
 * CLAIMED-but-nothing-in-a-cart for someone else to never be able to claim. */
async function revertClaim(slotId: string) {
  await prisma.claimSlot.updateMany({
    where: { id: slotId, status: "CLAIMED" },
    data: { status: "AVAILABLE", claimedByUserId: null, claimedAt: null },
  });
}
