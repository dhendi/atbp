import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logPromotionClick } from "@/lib/services/promotions";

// The destination is always resolved from the promotion's own productId,
// never from a client-supplied query param — a "to" param here would be an
// open-redirect gadget.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promotion = await prisma.promotion.findUnique({ where: { id } });
  if (!promotion?.productId) return NextResponse.redirect(new URL("/", req.url));

  await logPromotionClick(id);
  return NextResponse.redirect(new URL(`/product/${promotion.productId}`, req.url));
}
