"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateUserInterestsAction(interests: string[]) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  await prisma.user.update({ where: { id: session.user.id }, data: { interests } });
  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/discover");
  return { success: true };
}
