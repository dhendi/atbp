import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/services/rate-limit";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] });
  // Three substring queries per call, unauthenticated: cap the input length
  // and the request rate per client so this can't be used as a cheap way to
  // hammer the database.
  if (q.length > 60) return NextResponse.json({ suggestions: [] });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`suggest:${ip}`, 120, 60_000))) return NextResponse.json({ suggestions: [] }, { status: 429 });

  const [products, sellers, categories] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE", title: { contains: q, mode: "insensitive" } }, select: { title: true }, take: 4 }),
    prisma.sellerProfile.findMany({ where: { status: "APPROVED", shopName: { contains: q, mode: "insensitive" } }, select: { shopName: true }, take: 3 }),
    prisma.category.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { name: true }, take: 3 }),
  ]);

  const suggestions = [
    ...products.map((p) => ({ label: p.title, type: "Product" })),
    ...sellers.map((s) => ({ label: s.shopName, type: "Seller" })),
    ...categories.map((c) => ({ label: c.name, type: "Category" })),
  ].slice(0, 8);

  return NextResponse.json({ suggestions });
}
