"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationReadAction(id: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { read: true } });
  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } });
  revalidatePath("/notifications");
  return { success: true };
}

export async function updateWishlistNotificationPrefsAction(input: {
  notifyWishlistPriceDrop: boolean;
  notifyWishlistRestock: boolean;
  notifyWishlistLowStock: boolean;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  // Named fields, not `data: input` — this is a self-service action reachable
  // by any logged-in user, and Server Actions are just RPC endpoints, so an
  // un-typechecked extra key (e.g. `role: "ADMIN"`) in a crafted request body
  // would otherwise flow straight through to the update.
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      notifyWishlistPriceDrop: !!input.notifyWishlistPriceDrop,
      notifyWishlistRestock: !!input.notifyWishlistRestock,
      notifyWishlistLowStock: !!input.notifyWishlistLowStock,
    },
  });
  revalidatePath("/notifications");
  return { success: true };
}
