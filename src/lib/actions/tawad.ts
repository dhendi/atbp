"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTawadEligibleListing, submitOffer, respondToOffer, respondToCounter } from "@/lib/services/tawad";

export async function submitOfferAction(productId: string, amount: number) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const res = await submitOffer(session.user.id, productId, amount);
  revalidatePath(`/product/${productId}`);
  revalidatePath("/offers");
  return res;
}

export async function respondToOfferAction(offerId: string, action: "ACCEPT" | "DECLINE" | "COUNTER", counterAmount?: number) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "You need a seller account." };

  const res = await respondToOffer(seller.id, offerId, action, counterAmount);
  revalidatePath("/studio/tawad");
  return res;
}

export async function respondToCounterAction(offerId: string, action: "ACCEPT" | "DECLINE") {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const res = await respondToCounter(session.user.id, offerId, action);
  revalidatePath("/offers");
  return res;
}

export interface TawadSettingsInput {
  enabled: boolean;
  floor?: number;
  ceiling?: number;
}

/** Seller turning Tawad on/off (and setting the hidden floor / optional
 * ceiling) for one of their own Closet/Yard Sale items. Not available on My
 * Shop listings — enforced here, not just hidden in the UI. */
export async function setTawadSettingsAction(productId: string, input: TawadSettingsInput) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "You need a seller account." };

  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.id } });
  if (!product) return { error: "Item not found." };
  if (!isTawadEligibleListing(product)) return { error: "Tawad is only available on Closet and Yard Sale listings." };

  if (input.enabled) {
    if (!input.floor || input.floor <= 0) return { error: "Set a minimum offer you'd accept." };
    if (input.floor >= product.price) return { error: "Your minimum should be below the listed price." };
    if (input.ceiling != null && input.ceiling <= input.floor) return { error: "The auto-accept price should be higher than your minimum." };
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      tawadEnabled: input.enabled,
      tawadFloor: input.enabled ? input.floor : null,
      tawadCeiling: input.enabled ? (input.ceiling ?? null) : null,
    },
  });
  revalidatePath("/studio/closet");
  revalidatePath("/studio/yard-sale");
  return { success: true };
}
