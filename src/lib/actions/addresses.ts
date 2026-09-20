"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AddressInput {
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault?: boolean;
}

export async function addAddressAction(input: AddressInput) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  if (input.isDefault) {
    await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
  }
  const existingCount = await prisma.address.count({ where: { userId: session.user.id } });

  await prisma.address.create({
    data: { ...input, userId: session.user.id, isDefault: input.isDefault || existingCount === 0 },
  });
  revalidatePath("/addresses");
  return { success: true };
}

export async function deleteAddressAction(addressId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const existing = await prisma.address.findFirst({ where: { id: addressId, userId: session.user.id } });
  if (!existing) return { error: "Address not found." };

  await prisma.address.delete({ where: { id: addressId } });
  revalidatePath("/addresses");
  return { success: true };
}

export async function setDefaultAddressAction(addressId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  // Ownership check before the write, same as deleteAddressAction above —
  // without it, any logged-in user could pass another user's addressId and
  // flip that address's isDefault flag.
  const existing = await prisma.address.findFirst({ where: { id: addressId, userId: session.user.id } });
  if (!existing) return { error: "Address not found." };

  await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
  await prisma.address.update({ where: { id: addressId }, data: { isDefault: true } });
  revalidatePath("/addresses");
  return { success: true };
}
