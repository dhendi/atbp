import { cookies } from "next/headers";
import { cachedQuery } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AREA_COOKIE, isValidArea } from "@/lib/local-shared";

export * from "@/lib/local-shared";

export async function getSelectedArea(): Promise<string | null> {
  const store = await cookies();
  const cookieValue = store.get(AREA_COOKIE)?.value;
  if (cookieValue && isValidArea(cookieValue)) return cookieValue;

  // Fall back to the logged-in user's saved area (e.g. cleared cookies, new device).
  const session = await auth();
  if (session?.user) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { area: true } });
    if (user?.area && isValidArea(user.area)) return user.area;
  }
  return null;
}

export const getNearbySellers = cachedQuery(
  async (area: string, limit = 8) =>
    prisma.sellerProfile.findMany({
      where: { province: area, status: "APPROVED" },
      orderBy: [{ followerCount: "desc" }, { rating: "desc" }],
      take: limit,
      include: { hours: true },
    }),
  ["nearby-sellers"],
  { revalidate: 60, tags: ["sellers"] }
);

export const getNearbyProducts = cachedQuery(
  async (area: string, limit = 12) =>
    prisma.product.findMany({
      where: { status: "ACTIVE", seller: { province: area, status: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { seller: true },
    }),
  ["nearby-products"],
  { revalidate: 60, tags: ["products"] }
);

export const getLocalDeals = cachedQuery(
  async (area: string, limit = 12) => {
    const now = new Date();
    return prisma.product.findMany({
      where: {
        status: "ACTIVE",
        listingType: "FIXED",
        dealPrice: { not: null },
        dealStartAt: { lte: now },
        dealEndAt: { gte: now },
        seller: { province: area, status: "APPROVED" },
      },
      include: { seller: true },
      orderBy: { dealEndAt: "asc" },
      take: limit,
    });
  },
  ["local-deals"],
  { revalidate: 60, tags: ["products"] }
);

export const getFreeNearYou = cachedQuery(
  async (area: string, limit = 12) =>
    prisma.product.findMany({
      where: { status: "ACTIVE", price: { lte: 0 }, seller: { province: area, status: "APPROVED" } },
      include: { seller: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ["free-near-you"],
  { revalidate: 60, tags: ["products"] }
);

export const getRecommendedNearby = cachedQuery(
  async (area: string, limit = 12) =>
    prisma.product.findMany({
      where: { status: "ACTIVE", seller: { province: area, status: "APPROVED" } },
      include: { seller: true },
      orderBy: [{ likeCount: "desc" }, { viewCount: "desc" }],
      take: limit,
    }),
  ["recommended-nearby"],
  { revalidate: 60, tags: ["products"] }
);

export const getLocalEvents = cachedQuery(
  async (area: string, limit = 8) =>
    prisma.event.findMany({
      where: { city: area, status: { in: ["UPCOMING", "LIVE"] } },
      orderBy: { eventDate: "asc" },
      take: limit,
    }),
  ["local-events"],
  { revalidate: 60, tags: ["events"] }
);

/** Real-world maker markets in this exact city — same area-matching convention
 * as events/sellers, city-level only (no GPS needed). */
export const getLocalMarkets = cachedQuery(
  async (area: string, limit = 5) =>
    prisma.market.findMany({ where: { city: area, active: true }, orderBy: { order: "asc" }, take: limit }),
  ["local-markets"],
  { revalidate: 60, tags: ["markets"] }
);

export const getLocalDrops = cachedQuery(
  async (area: string, limit = 8) =>
    prisma.drop.findMany({
      where: { status: { in: ["UPCOMING", "LIVE"] }, seller: { province: area, status: "APPROVED" } },
      include: { seller: true, products: true },
      orderBy: { releaseAt: "asc" },
      take: limit,
    }),
  ["local-drops"],
  { revalidate: 60, tags: ["drops"] }
);

function upcomingWeekendRange(now: Date = new Date()) {
  // "This weekend" = the next Friday 00:00 through Sunday 23:59:59 (today counts if it's already Fri/Sat/Sun).
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const daysUntilFriday = (5 - day + 7) % 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + daysUntilFriday);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export const getWeekendDigest = cachedQuery(
  async (area: string) => {
    const { start, end } = upcomingWeekendRange();
    const [events, drops, deals] = await Promise.all([
      prisma.event.findMany({
        where: { city: area, status: { in: ["UPCOMING", "LIVE"] }, eventDate: { gte: start, lte: end } },
        orderBy: { eventDate: "asc" },
        take: 6,
      }),
      prisma.drop.findMany({
        where: { status: { in: ["UPCOMING", "LIVE"] }, releaseAt: { gte: start, lte: end }, seller: { province: area, status: "APPROVED" } },
        include: { seller: true, products: true },
        orderBy: { releaseAt: "asc" },
        take: 6,
      }),
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
          dealPrice: { not: null },
          dealEndAt: { gte: start },
          dealStartAt: { lte: end },
          seller: { province: area, status: "APPROVED" },
        },
        include: { seller: true },
        take: 6,
      }),
    ]);
    return { events, drops, deals, range: { start, end } };
  },
  ["weekend-digest"],
  { revalidate: 60, tags: ["events", "drops", "products"] }
);

export const getSellerLocalDeliveryEligible = cachedQuery(
  async (sellerId: string, area: string) => {
    const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
    if (!seller || !seller.localDeliveryAvailable) return false;
    const areas = seller.localDeliveryAreas as string[];
    return areas.includes(area);
  },
  ["seller-local-delivery-eligible"],
  { revalidate: 60, tags: ["sellers"] }
);
