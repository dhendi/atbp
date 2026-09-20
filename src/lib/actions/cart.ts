"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import * as cartService from "@/lib/services/cart";
import { logProductEvent } from "@/lib/trending";

export async function addToCartAction(productId: string, quantity = 1, personalizationNote?: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  try {
    await cartService.addToCart(session.user.id, productId, quantity, personalizationNote);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't add this to your cart." };
  }
  await logProductEvent(productId, "CART_ADD", session.user.id);
  revalidatePath("/cart");
  return { success: true };
}

export async function removeCartItemAction(cartItemId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  await cartService.removeCartItem(session.user.id, cartItemId);
  revalidatePath("/cart");
  return { success: true };
}

export async function saveCartItemForLaterAction(cartItemId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  const res = await cartService.saveCartItemForLater(session.user.id, cartItemId);
  revalidatePath("/cart");
  revalidatePath("/saved");
  return res;
}

export async function moveSavedToCartAction(productId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  try {
    await cartService.moveSavedToCart(session.user.id, productId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't move this to your cart." };
  }
  revalidatePath("/cart");
  revalidatePath("/saved");
  return { success: true };
}

export async function updateCartItemQuantityAction(cartItemId: string, quantity: number) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  await cartService.updateCartItemQuantity(session.user.id, cartItemId, quantity);
  revalidatePath("/cart");
  return { success: true };
}
