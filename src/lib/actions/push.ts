"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function savePushSubscriptionAction(sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId: session.user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    create: { userId: session.user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  return { success: true };
}

export async function removePushSubscriptionAction(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return { success: true };
}

export async function hasPushSubscriptionAction() {
  const session = await auth();
  if (!session?.user) return { count: 0 };
  const count = await prisma.pushSubscription.count({ where: { userId: session.user.id } });
  return { count };
}
