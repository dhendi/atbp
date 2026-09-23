import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/discover`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/auctions`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/deals`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/trending`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/closets`, changeFrequency: "hourly", priority: 0.7 },
    { url: `${base}/yard-sales`, changeFrequency: "hourly", priority: 0.7 },
    { url: `${base}/drops`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/markets`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/picks`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/gifts`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/made-to-order`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/local`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/sell`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/help`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/buyer-protection`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/prohibited-items`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const [products, sellers] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, createdAt: true },
      take: 5000,
      orderBy: { createdAt: "desc" },
    }),
    prisma.sellerProfile.findMany({
      where: { status: "APPROVED" },
      select: { handle: true, createdAt: true },
      take: 2000,
    }),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/product/${p.id}`,
    lastModified: p.createdAt,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const sellerRoutes: MetadataRoute.Sitemap = sellers.map((s) => ({
    url: `${base}/seller/${s.handle}`,
    lastModified: s.createdAt,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...productRoutes, ...sellerRoutes];
}
