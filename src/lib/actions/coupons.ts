"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claimFirstPurchaseCoupon } from "@/lib/services/coupons";

/** For an already-logged-in visitor: opts them into marketing emails and claims the coupon in one step. */
export async function subscribeAndClaimCouponAction() {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  await prisma.user.update({ where: { id: session.user.id }, data: { marketingOptIn: true } });
  const result = await claimFirstPurchaseCoupon(session.user.id);

  revalidatePath("/");
  revalidatePath("/coupons");
  return result;
}
