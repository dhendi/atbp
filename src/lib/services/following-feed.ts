import { prisma } from "@/lib/prisma";

export interface FollowingActivityItem {
  sellerId: string;
  shopName: string;
  handle: string;
  logoUrl: string | null;
  kind: "DROP" | "AUCTION" | "PRODUCT";
  label: string;
  href: string;
  at: Date;
}

const RECENT_WINDOW_MS = 5 * 24 * 60 * 60 * 1000; // 5 days — "new" has to actually be new

function formatDropWhen(releaseAt: Date) {
  const day = releaseAt.toLocaleDateString("en-PH", { weekday: "long" });
  const time = releaseAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

/** "What's new from the shops I follow" — one headline activity per shop, most recent first.
 *  Priority per shop: an upcoming drop beats a fresh auction beats a fresh listing, since a
 *  drop is the most anticipation-worthy thing a followed shop can have going on. */
export async function getFollowingActivity(userId: string): Promise<FollowingActivityItem[]> {
  const follows = await prisma.follow.findMany({ where: { followerId: userId }, include: { seller: true } });
  if (follows.length === 0) return [];

  const sellerIds = follows.map((f) => f.sellerId);
  const since = new Date(Date.now() - RECENT_WINDOW_MS);

  const [upcomingDrops, recentAuctions, recentProducts] = await Promise.all([
    prisma.drop.findMany({
      where: { sellerId: { in: sellerIds }, status: "UPCOMING", releaseAt: { gt: new Date() } },
      orderBy: { releaseAt: "asc" },
    }),
    prisma.productAuction.findMany({
      where: { product: { sellerId: { in: sellerIds } }, status: "ACTIVE", createdAt: { gte: since } },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { sellerId: { in: sellerIds }, status: "ACTIVE", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const items: FollowingActivityItem[] = [];
  for (const follow of follows) {
    const seller = follow.seller;
    const drop = upcomingDrops.find((d) => d.sellerId === seller.id);
    const auction = recentAuctions.find((a) => a.product.sellerId === seller.id);
    const product = recentProducts.find((p) => p.sellerId === seller.id);

    if (drop) {
      items.push({
        sellerId: seller.id, shopName: seller.shopName, handle: seller.handle, logoUrl: seller.logoUrl,
        kind: "DROP", label: `${drop.name} · ${formatDropWhen(drop.releaseAt)}`, href: `/drops/${drop.id}`, at: drop.releaseAt,
      });
    } else if (auction) {
      items.push({
        sellerId: seller.id, shopName: seller.shopName, handle: seller.handle, logoUrl: seller.logoUrl,
        kind: "AUCTION", label: "New auction started", href: `/product/${auction.product.id}`, at: auction.createdAt,
      });
    } else if (product) {
      const count = recentProducts.filter((p) => p.sellerId === seller.id).length;
      items.push({
        sellerId: seller.id, shopName: seller.shopName, handle: seller.handle, logoUrl: seller.logoUrl,
        kind: "PRODUCT", label: count > 1 ? `${count} new products added` : `New: ${product.title}`, href: `/product/${product.id}`, at: product.createdAt,
      });
    }
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}
