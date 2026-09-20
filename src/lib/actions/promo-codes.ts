"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promoCodeInputSchema, firstIssue } from "@/lib/validation";

async function requireSeller() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
}

export interface PromoCodeInput {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minSubtotal?: number | null;
  maxRedemptions?: number | null;
  perUserLimit: number;
  expiresAt?: string | null;
}

export async function createPromoCodeAction(input: PromoCodeInput) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };

  const promoResult = promoCodeInputSchema.safeParse({ code: input.code, discountValue: input.discountValue, minSubtotal: input.minSubtotal });
  if (!promoResult.success) return { error: firstIssue(promoResult) };
  const code = promoResult.data.code.toUpperCase();
  const discountValue = promoResult.data.discountValue;
  const minSubtotal = promoResult.data.minSubtotal;
  if (input.discountType === "PERCENT" && discountValue > 100) return { error: "A percentage discount can't exceed 100%." };

  const existing = await prisma.promoCode.findUnique({ where: { sellerId_code: { sellerId: seller.id, code } } });
  if (existing) return { error: "You already have a code with that name." };

  await prisma.promoCode.create({
    data: {
      sellerId: seller.id,
      code,
      discountType: input.discountType,
      discountValue,
      minSubtotal: minSubtotal ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      perUserLimit: input.perUserLimit || 1,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });

  revalidatePath("/studio/promo-codes");
  return { success: true };
}

export async function togglePromoCodeAction(id: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "Not authorized." };

  const promo = await prisma.promoCode.findFirst({ where: { id, sellerId: seller.id } });
  if (!promo) return { error: "Promo code not found." };

  await prisma.promoCode.update({ where: { id }, data: { active: !promo.active } });
  revalidatePath("/studio/promo-codes");
  return { success: true };
}

export async function deletePromoCodeAction(id: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "Not authorized." };

  const promo = await prisma.promoCode.findFirst({ where: { id, sellerId: seller.id } });
  if (!promo) return { error: "Promo code not found." };

  await prisma.promoCode.delete({ where: { id } });
  revalidatePath("/studio/promo-codes");
  return { success: true };
}
