import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/v1/products/:id — public product detail. Mirrors the notFound()
 * rule on the web product page: not ACTIVE/SOLD_OUT, or the seller is
 * suspended, means "not found" rather than leaking the listing's existence. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      seller: { select: { shopName: true, handle: true, rating: true, ratingCount: true, verified: true, status: true, logoUrl: true, isSampleContent: true } },
      category: { select: { name: true, slug: true } },
      auction: true,
    },
  });
  if (!product || (product.status !== "ACTIVE" && product.status !== "SOLD_OUT") || product.seller.status === "SUSPENDED") {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ product });
}
