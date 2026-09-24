"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Explicit shape: the client object used to be spread straight into
// prisma.address.create, with no length limits and no cap on how many
// addresses one account could store.
const addressSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(20),
  line1: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(120),
  province: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(1).max(12),
  isDefault: z.boolean().optional(),
});
const MAX_ADDRESSES_PER_USER = 20;

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

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { error: "Please check the address fields and try again." };
  const address = parsed.data;

  const existingCount = await prisma.address.count({ where: { userId: session.user.id } });
  if (existingCount >= MAX_ADDRESSES_PER_USER) return { error: "You've reached the limit for saved addresses." };
  if (address.isDefault) {
    await prisma.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
  }

  await prisma.address.create({
    data: {
      fullName: address.fullName, phone: address.phone, line1: address.line1, city: address.city,
      province: address.province, postalCode: address.postalCode,
      userId: session.user.id, isDefault: !!address.isDefault || existingCount === 0,
    },
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
