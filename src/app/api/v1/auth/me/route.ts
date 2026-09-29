import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser } from "@/lib/mobile-auth";
import { isPlaceholderEmail } from "@/lib/phone";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { id: true, name: true, username: true, email: true, avatarUrl: true, role: true, phone: true, emailVerifiedAt: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: auth.id },
    select: { id: true, shopName: true, handle: true, status: true },
  });

  return NextResponse.json({
    user: {
      ...user,
      hasVerifiedEmail: !!user.emailVerifiedAt || isPlaceholderEmail(user.email),
    },
    sellerProfile,
  });
}
