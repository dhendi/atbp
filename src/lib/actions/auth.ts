"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { claimFirstPurchaseCoupon } from "@/lib/services/coupons";
import { claimGuestOrders } from "@/lib/services/guest-checkout";

const signupSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  username: z
    .string()
    .min(3, "Username too short")
    .max(20)
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, and underscores only"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signupAction(_prevState: unknown, formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    username: (formData.get("username") as string)?.toLowerCase(),
    email: (formData.get("email") as string)?.toLowerCase(),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, username, email, password } = parsed.data;
  const marketingOptIn = formData.get("marketingOptIn") === "on";

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) {
    return { error: existing.email === email ? "Email already registered." : "Username already taken." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, username, email, passwordHash, role: "BUYER", marketingOptIn },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  await claimGuestOrders(user.id, email);

  let couponCode: string | null = null;
  if (marketingOptIn) {
    const claim = await claimFirstPurchaseCoupon(user.id);
    if ("success" in claim) couponCode = claim.coupon.code;
  }

  return { success: true, couponCode };
}
