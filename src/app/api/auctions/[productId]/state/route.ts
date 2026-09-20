import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const auction = await prisma.productAuction.findUnique({ where: { productId } });
  if (!auction) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    currentBid: auction.currentBid,
    bidCount: auction.bidCount,
    status: auction.status,
    endAt: auction.endAt,
  });
}
