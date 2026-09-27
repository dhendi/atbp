import type { Metadata } from "next";
import Link from "next/link";
import { Search, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MakerCard } from "@/components/domain/maker-card";
import { EmptyState } from "@/components/domain/empty-state";
import { Input } from "@/components/ui/input";
import { topIdentityInterests } from "@/lib/interests";

export const dynamic = "force-dynamic";

const SHOPS_TITLE = "Shops";
const SHOPS_DESCRIPTION = "Browse every shop on ATBP: small makers, collectors, and resellers from across the Philippines.";

export const metadata: Metadata = {
  title: SHOPS_TITLE,
  description: SHOPS_DESCRIPTION,
  openGraph: { title: SHOPS_TITLE, description: SHOPS_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
};

const PAGE_LIMIT = 60;

export default async function ShopsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim().slice(0, 80) ?? "";
  // Server Component, not client render: wall-clock time here is correct, not impure.
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const shops = await prisma.sellerProfile.findMany({
    where: {
      status: "APPROVED",
      ...(query
        ? { OR: [{ shopName: { contains: query, mode: "insensitive" } }, { handle: { contains: query, mode: "insensitive" } }, { province: { contains: query, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: [{ verified: "desc" }, { followerCount: "desc" }, { createdAt: "desc" }],
    take: PAGE_LIMIT,
    include: {
      products: { where: { status: "ACTIVE" }, take: 6, orderBy: { createdAt: "desc" } },
      _count: { select: { products: { where: { status: "ACTIVE", createdAt: { gte: sevenDaysAgo } } } } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Shops</h1>
      <p className="mt-1 text-sm text-ink-500">Small shops, makers, and collectors from around the country.</p>

      <form className="mt-5 flex items-center gap-2" action="/shops">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input name="q" defaultValue={query} placeholder="Search by shop name or city" className="pl-8" />
        </div>
        {query && <Link href="/shops" className="text-xs font-semibold text-ink-500 hover:text-ink-800">Clear</Link>}
      </form>

      {shops.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Store} title={query ? "No shops match that search" : "No shops yet"} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((s) => (
            <MakerCard
              key={s.id}
              fluid
              seller={{
                id: s.id, shopName: s.shopName, handle: s.handle, description: s.description,
                logoUrl: s.logoUrl, bannerUrl: s.bannerUrl, province: s.province, followerCount: s.followerCount,
                rating: s.rating, ratingCount: s.ratingCount, badges: s.badges as string[], verified: s.verified,
                isSampleContent: s.isSampleContent,
                previewProducts: s.products.map((p) => ({ id: p.id, image: (p.images as string[])[0] })),
                topInterests: topIdentityInterests(s.products),
                newThisWeek: s._count.products,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
