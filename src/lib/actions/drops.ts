"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** A reminder for one specific drop — distinct from following the seller generally. */
export async function toggleDropReminderAction(dropId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const existing = await prisma.dropReminder.findUnique({
    where: { dropId_userId: { dropId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.dropReminder.delete({ where: { id: existing.id } });
    revalidatePath("/drops");
    revalidatePath(`/drops/${dropId}`);
    return { success: true, reminded: false };
  }

  await prisma.dropReminder.create({ data: { dropId, userId: session.user.id } });
  revalidatePath("/drops");
  revalidatePath(`/drops/${dropId}`);
  return { success: true, reminded: true };
}
