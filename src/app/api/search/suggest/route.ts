import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });

  const [products, sellers, categories] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE", title: { contains: q, mode: "insensitive" } }, select: { title: true }, take: 4 }),
    prisma.sellerProfile.findMany({ where: { shopName: { contains: q, mode: "insensitive" } }, select: { shopName: true }, take: 3 }),
    prisma.category.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { name: true }, take: 3 }),
  ]);

  const suggestions = [
    ...products.map((p) => ({ label: p.title, type: "Product" })),
    ...sellers.map((s) => ({ label: s.shopName, type: "Seller" })),
    ...categories.map((c) => ({ label: c.name, type: "Category" })),
  ].slice(0, 8);

  return NextResponse.json({ suggestions });
}
