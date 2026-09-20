import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCartWithItems } from "@/lib/services/cart";
import { ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { CartClient } from "./cart-client";
import { ProductCard } from "@/components/domain/product-card";
import { toProductCardData } from "@/lib/product-card-data";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { getBecauseYouLookedAt } from "@/lib/services/personalization";
import { getTrendingProducts, getTrendingProductIdSet } from "@/lib/trending";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/cart");

  const [items, savedForLater] = await Promise.all([
    getCartWithItems(session.user.id),
    prisma.savedProduct.findMany({
      where: { userId: session.user.id },
      include: { product: { include: { seller: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cartProductIds = items.map((i) => i.productId);
  const [becauseYouLookedAt, trending] = await Promise.all([
    getBecauseYouLookedAt(session.user.id, 10),
    getTrendingProducts({ limit: 10 }),
  ]);
  const youMightLike = (becauseYouLookedAt.products.length > 0 ? becauseYouLookedAt.products : trending).filter(
    (p) => !cartProductIds.includes(p.id)
  );
  const trendingIds = await getTrendingProductIdSet();
  const [recSavedIds, recSocialProofMap] = await Promise.all([
    getSavedProductIdSet(session.user.id),
    getSocialProofMap(youMightLike.map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6">
      <h1 className="mb-5 text-2xl font-extrabold text-ink-900">Your Cart</h1>
      {items.length === 0 && savedForLater.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Your cart is empty" description="Anything you add will show up here." />
      ) : (
        <CartClient
          items={items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            sourceType: i.sourceType,
            product: {
              id: i.product.id,
              title: i.product.title,
              images: i.product.images as string[],
              quantityAvailable: i.product.quantityAvailable,
            },
            seller: { shopName: i.product.seller.shopName, handle: i.product.seller.handle },
          }))}
          savedForLater={savedForLater
            .filter((s) => s.product.status !== "REMOVED")
            .map((s) => ({
              productId: s.product.id,
              title: s.product.title,
              image: (s.product.images as string[])[0],
              price: s.product.price,
              seller: { shopName: s.product.seller.shopName, handle: s.product.seller.handle },
            }))}
        />
      )}
      <div className="mt-6 text-center">
        <Link href="/discover" className="text-sm font-semibold text-brand-600 hover:underline">
          Keep browsing →
        </Link>
      </div>

      {youMightLike.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-ink-900">You might like</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {youMightLike.map((p) => (
              <div key={p.id} className="w-[150px] shrink-0">
                <ProductCard
                  product={toProductCardData(p, {
                    trending: trendingIds.has(p.id),
                    isSaved: recSavedIds.has(p.id),
                    socialProof: recSocialProofMap.get(p.id),
                  })}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
