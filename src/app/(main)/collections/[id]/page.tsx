import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Lock, Globe, FolderHeart, Package, Store, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/domain/product-card";
import { MakerCard } from "@/components/domain/maker-card";
import { DropCard } from "@/components/domain/drop-card";
import { EmptyState } from "@/components/domain/empty-state";
import { toProductCardData } from "@/lib/product-card-data";
import { topIdentityInterests } from "@/lib/interests";
import { getTrendingProductIdSet } from "@/lib/trending";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { CollectionHeaderActions } from "../collection-header-actions";
import { RemoveItemButton } from "./remove-item-button";

export const dynamic = "force-dynamic";

// Only a public collection gets real SEO investment — a private one is only
// ever reachable by its owner (the page itself 404s for anyone else), so
// indexing it would only ever leak a snippet of someone's private saved list.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const collection = await prisma.userCollection.findUnique({ where: { id }, select: { name: true, description: true, isPublic: true } });
  if (!collection) return { title: "Collection not found" };
  if (!collection.isPublic) return { title: "Collection", robots: { index: false, follow: false } };

  const title = collection.name;
  const description = collection.description?.slice(0, 160) ?? `A curated collection of products, shops, and drops on ATBP: ${collection.name}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  // Server Component, not client render — wall-clock time here is correct, not impure.
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const collection = await prisma.userCollection.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, username: true } },
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          product: { include: { seller: true, auction: true } },
          seller: { include: { products: { where: { status: "ACTIVE" }, take: 6, orderBy: { createdAt: "desc" } }, _count: { select: { products: { where: { status: "ACTIVE", createdAt: { gte: sevenDaysAgo } } } } } } },
          drop: { include: { seller: true, products: true } },
        },
      },
    },
  });

  if (!collection) notFound();
  const isOwner = session?.user?.id === collection.userId;
  if (!collection.isPublic && !isOwner) notFound();

  const productItems = collection.items.filter((i) => i.product);
  const sellerItems = collection.items.filter((i) => i.seller);
  const dropItems = collection.items.filter((i) => i.drop);

  const [trendingIds, savedIds, socialProofMap, followingIds, myDropReminders] = await Promise.all([
    getTrendingProductIdSet(),
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap(productItems.map((i) => ({ id: i.product!.id, quantityAvailable: i.product!.quantityAvailable }))),
    session?.user
      ? prisma.follow.findMany({ where: { followerId: session.user.id } }).then((f) => new Set(f.map((r) => r.sellerId)))
      : Promise.resolve(new Set<string>()),
    session?.user
      ? prisma.dropReminder.findMany({ where: { userId: session.user.id } }).then((r) => new Set(r.map((x) => x.dropId)))
      : Promise.resolve(new Set<string>()),
  ]);
  const cardOpts = (pid: string) => ({ isSaved: savedIds.has(pid), socialProof: socialProofMap.get(pid) });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pt-4 md:px-6 md:pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
            {collection.isPublic ? <Globe size={12} /> : <Lock size={12} />} {collection.isPublic ? "Public collection" : "Private collection"}
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold text-ink-900 md:text-3xl">{collection.name}</h1>
          {collection.description && <p className="mt-1 max-w-lg text-sm text-ink-600">{collection.description}</p>}
          {!isOwner && <p className="mt-1 text-xs text-ink-400">By {collection.user.name}</p>}
        </div>
        {isOwner && <CollectionHeaderActions collection={{ id: collection.id, name: collection.name, description: collection.description, isPublic: collection.isPublic }} />}
      </div>

      {collection.items.length === 0 ? (
        <EmptyState
          icon={FolderHeart}
          title="Nothing saved here yet"
          description="Add products, shops, or drops to this collection from their pages."
          action={{ href: "/discover", label: "Browse ATBP" }}
        />
      ) : (
        <div className="space-y-8">
          {productItems.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><Package size={15} className="text-brand-500" /> Products</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
                {productItems.map((item) => (
                  <div key={item.id} className="relative">
                    {isOwner && <RemoveItemButton collectionId={collection.id} itemId={item.id} />}
                    <ProductCard product={toProductCardData(item.product!, { trending: trendingIds.has(item.product!.id), ...cardOpts(item.product!.id) })} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {sellerItems.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><Store size={15} className="text-brand-500" /> Shops</h2>
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                {sellerItems.map((item) => (
                  <div key={item.id} className="relative">
                    {isOwner && <RemoveItemButton collectionId={collection.id} itemId={item.id} />}
                    <MakerCard
                      seller={{
                        id: item.seller!.id, shopName: item.seller!.shopName, handle: item.seller!.handle, description: item.seller!.description,
                        logoUrl: item.seller!.logoUrl, bannerUrl: item.seller!.bannerUrl, province: item.seller!.province, followerCount: item.seller!.followerCount,
                        rating: item.seller!.rating, ratingCount: item.seller!.ratingCount, badges: item.seller!.badges as string[], verified: item.seller!.verified,
                        previewProducts: item.seller!.products.map((p) => ({ id: p.id, image: (p.images as string[])[0] })),
                        topInterests: topIdentityInterests(item.seller!.products),
                        newThisWeek: item.seller!._count.products,
                      }}
                      isFollowing={followingIds.has(item.seller!.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {dropItems.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><Sparkles size={15} className="text-brand-500" /> Drops</h2>
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                {dropItems.map((item) => (
                  <div key={item.id} className="relative">
                    {isOwner && <RemoveItemButton collectionId={collection.id} itemId={item.id} />}
                    <DropCard
                      drop={{
                        id: item.drop!.id, name: item.drop!.name, coverImage: item.drop!.coverImage, releaseAt: item.drop!.releaseAt.toISOString(),
                        seller: item.drop!.seller, quantityAvailable: item.drop!.products.reduce((sum, p) => sum + p.quantityAvailable, 0),
                      }}
                      isReminded={myDropReminders.has(item.drop!.id)}
                      loggedIn={!!session?.user}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
