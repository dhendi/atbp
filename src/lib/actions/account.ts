"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateAccountProfileAction(input: { name: string; avatarUrl?: string | null }) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const name = input.name.trim();
  if (!name) return { error: "Please enter your name." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, avatarUrl: input.avatarUrl || null },
  });

  revalidatePath("/profile");
  revalidatePath("/settings");
  return { success: true };
}
