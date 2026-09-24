"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { prisma } from "@/lib/prisma";
import { claimFirstPurchaseCoupon } from "@/lib/services/coupons";

const signupSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  username: z
    .string()
    .min(3, "Username too short")
    .max(20)
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, and underscores only"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
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

  // Signup was completely unthrottled: free, unlimited account creation is
  // what makes coupon farming and spam accounts cheap. Per-client cap here.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`signup:${ip}`, 8, 60 * 60_000))) {
    return { error: "Too many sign-ups from this connection. Please try again later." };
  }
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  const agreedToTerms = formData.get("agreedToTerms") === "on";
  if (!agreedToTerms) {
    return { error: "Please agree to the Terms of Service and Privacy Policy to continue." };
  }

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) {
    return { error: existing.email === email ? "Email already registered." : "Username already taken." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, username, email, passwordHash, role: "BUYER", marketingOptIn, termsAgreedAt: new Date() },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  // Guest orders placed under this email are NOT claimed here: nothing has
  // proven this person owns the inbox yet, so signing up with someone else's
  // address would otherwise hand over their earlier guest orders (names,
  // addresses). They're claimed the moment the email is actually verified.

  let couponCode: string | null = null;
  if (marketingOptIn) {
    const claim = await claimFirstPurchaseCoupon(user.id);
    if ("success" in claim) couponCode = claim.coupon.code;
  }

  return { success: true, couponCode };
}
