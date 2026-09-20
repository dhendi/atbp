"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function blockUserAction(targetUserId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (session.user.id === targetUserId) return { error: "You can't block yourself." };

  await prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId: session.user.id, blockedId: targetUserId } },
    update: {},
    create: { blockerId: session.user.id, blockedId: targetUserId },
  });
  revalidatePath("/messages");
  return { success: true };
}

export async function unblockUserAction(targetUserId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  await prisma.blockedUser.deleteMany({ where: { blockerId: session.user.id, blockedId: targetUserId } });
  revalidatePath("/messages");
  return { success: true };
}

export async function isBlockedBetween(userIdA: string, userIdB: string) {
  const block = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
  });
  return !!block;
}

export async function amIBlockedByAction(otherUserId: string) {
  const session = await auth();
  if (!session?.user) return { blocked: false, blockedByMe: false, blockedByThem: false };

  const [byMe, byThem] = await Promise.all([
    prisma.blockedUser.findUnique({ where: { blockerId_blockedId: { blockerId: session.user.id, blockedId: otherUserId } } }),
    prisma.blockedUser.findUnique({ where: { blockerId_blockedId: { blockerId: otherUserId, blockedId: session.user.id } } }),
  ]);
  return { blocked: !!byMe || !!byThem, blockedByMe: !!byMe, blockedByThem: !!byThem };
}
