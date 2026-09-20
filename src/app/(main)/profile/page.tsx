import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, Heart, MapPin, Store, ShieldCheck, ChevronRight, Users, CreditCard, Bell, MessageCircle, FolderHeart, LifeBuoy, Pencil, Gift, Handshake, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/domain/product-card";
import { MakerCard } from "@/components/domain/maker-card";
import { EmptyState } from "@/components/domain/empty-state";
import { RecentlyViewedSection } from "./recently-viewed";
import { initials } from "@/lib/utils";
import { isPlaceholderEmail } from "@/lib/phone";
import { toProductCardData } from "@/lib/product-card-data";
import { topIdentityInterests } from "@/lib/interests";
import { getTrendingProductIdSet } from "@/lib/trending";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { LogoutButton } from "./logout-button";
import { InterestsOnboarding } from "@/components/domain/interests-onboarding";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/profile");

  const [user, saved, sellerProfile, follows, messageThreads] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, include: { addresses: true } }),
    prisma.savedProduct.findMany({ where: { userId: session.user.id }, include: { product: { include: { seller: true, auction: true } } }, take: 8 }),
    prisma.sellerProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.follow.findMany({ where: { followerId: session.user.id } }),
    prisma.messageThread.findMany({
      where: { OR: [{ buyerId: session.user.id }, { seller: { userId: session.user.id } }] },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
  ]);
  if (!user) redirect("/login");

  const unreadMessageCount = messageThreads.filter((t) => t.messages[0] && t.messages[0].senderId !== session.user.id && !t.messages[0].readAt).length;

  const savedCategoryIds = [...new Set(saved.map((s) => s.product.categoryId))];
  const followedSellerIds = follows.map((f) => f.sellerId);
  const excludeIds = saved.map((s) => s.product.id);
  const interests = user.interests as string[];
  const personalizationFilters = [
    followedSellerIds.length ? { sellerId: { in: followedSellerIds } } : undefined,
    savedCategoryIds.length ? { categoryId: { in: savedCategoryIds } } : undefined,
    ...interests.map((slug) => ({ tags: { array_contains: slug } })),
  ].filter(Boolean) as Record<string, unknown>[];

  const forYou = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: excludeIds },
      ...(personalizationFilters.length ? { OR: personalizationFilters } : {}),
    },
    include: { seller: true, auction: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  // Shops recommended — sellers behind the same "For You" signals (followed
  // sellers' categories, saved categories, interests), excluding shops already followed.
  // Server Component, not client render — wall-clock time here is correct, not impure.
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const recommendedSellerRows = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      sellerId: { notIn: followedSellerIds },
      ...(personalizationFilters.length ? { OR: personalizationFilters } : {}),
    },
    select: { sellerId: true },
    distinct: ["sellerId"],
    take: 10,
  });
  const recommendedSellers = recommendedSellerRows.length > 0
    ? await prisma.sellerProfile.findMany({
        where: { id: { in: recommendedSellerRows.map((r) => r.sellerId) }, status: "APPROVED" },
        include: {
          products: { where: { status: "ACTIVE" }, take: 6, orderBy: { createdAt: "desc" } },
          _count: { select: { products: { where: { status: "ACTIVE", createdAt: { gte: sevenDaysAgo } } } } },
        },
      })
    : [];

  const trendingIds = await getTrendingProductIdSet();
  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session.user.id),
    getSocialProofMap([...forYou, ...saved.map((s) => s.product)].map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-10 md:px-6">
      <div className="mb-6 flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold text-ink-900">{user.name}</h1>
          <p className="text-sm text-ink-500">
            @{user.username} · {isPlaceholderEmail(user.email) ? (user.phone ?? "No email on file") : user.email}
          </p>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
        >
          <Pencil size={12} /> Edit
        </Link>
      </div>

      <Button asChild variant="brand" size="lg" className="mb-6 w-full">
        <Link href={sellerProfile ? "/studio/products/new" : "/sell"}>
          <Plus size={18} strokeWidth={2.5} />
          {sellerProfile ? "List a New Item" : "Start Selling on ATBP"}
        </Link>
      </Button>

      {interests.length === 0 && <InterestsOnboarding />}

      <div className="space-y-2">
        <ProfileLink href="/orders" icon={Package} label="My Orders" />
        <ProfileLink href="/offers" icon={Handshake} label="My Tawad Offers" />
        <ProfileLink href="/saved" icon={Heart} label="Saved Items" />
        <ProfileLink href="/coupons" icon={Gift} label="My Coupons / Rewards" />
        <ProfileLink href="/collections" icon={FolderHeart} label="My Collections" />
        <ProfileLink href="/following" icon={Users} label="Following" />
        <ProfileLink href="/messages" icon={MessageCircle} label="Messages" badge={unreadMessageCount > 0 ? String(unreadMessageCount) : undefined} />
        <ProfileLink href="/notifications" icon={Bell} label="Notifications" />
        <ProfileLink href="/addresses" icon={MapPin} label="Addresses" />
        <ProfileLink href="/payment-methods" icon={CreditCard} label="Payment Methods" />
        <ProfileLink href="/help" icon={LifeBuoy} label="Help Center" />
        {sellerProfile ? (
          <ProfileLink href="/studio" icon={Store} label="Seller Studio" badge={sellerProfile.status === "PENDING" ? "Pending approval" : undefined} />
        ) : (
          <ProfileLink href="/sell" icon={Store} label="Sell on ATBP" />
        )}
        {session.user.role === "ADMIN" && <ProfileLink href="/admin" icon={ShieldCheck} label="Admin Dashboard" />}
      </div>

      <RecentlyViewedSection />

      {forYou.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">For You</h2>
          <p className="mb-3 -mt-2 text-xs text-ink-500">Picked from sellers you follow and categories you save</p>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {forYou.map((p) => (
              <div key={p.id} className="w-[150px] shrink-0">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {recommendedSellers.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Shops You Might Like</h2>
          <p className="mb-3 -mt-2 text-xs text-ink-500">Sellers in the categories you follow and save</p>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {recommendedSellers.map((s) => (
              <MakerCard
                key={s.id}
                seller={{
                  id: s.id, shopName: s.shopName, handle: s.handle, description: s.description,
                  logoUrl: s.logoUrl, bannerUrl: s.bannerUrl, province: s.province, followerCount: s.followerCount,
                  rating: s.rating, ratingCount: s.ratingCount, badges: s.badges as string[], verified: s.verified,
                  previewProducts: s.products.map((p) => ({ id: p.id, image: (p.images as string[])[0] })),
                  topInterests: topIdentityInterests(s.products),
                  newThisWeek: s._count.products,
                }}
              />
            ))}
          </div>
        </section>
      )}

      <section id="saved" className="mt-6">
        <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Saved Items</h2>
        {saved.length === 0 ? (
          <EmptyState icon={Heart} title="No saved items yet" action={{ href: "/discover?sort=newest", label: "Browse New on ATBP" }} />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
            {saved.map((s) => (
              <ProductCard key={s.id} product={toProductCardData(s.product, { trending: trendingIds.has(s.product.id), ...cardOpts(s.product.id) })} />
            ))}
          </div>
        )}
      </section>

      <LogoutButton />
    </div>
  );
}

function ProfileLink({ href, icon: Icon, label, badge }: { href: string; icon: typeof Package; label: string; badge?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 hover:bg-ink-50">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-600">
        <Icon size={16} />
      </span>
      <span className="flex-1 font-semibold text-ink-800">{label}</span>
      {badge && <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-bold text-gold-600">{badge}</span>}
      <ChevronRight size={16} className="text-ink-300" />
    </Link>
  );
}
