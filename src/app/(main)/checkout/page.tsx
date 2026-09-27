import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSelectedArea } from "@/lib/services/local";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { getBecauseYouLookedAt, getBasedOnYourSearches } from "@/lib/services/personalization";
import { getTrendingProducts } from "@/lib/trending";
import { toProductCardData } from "@/lib/product-card-data";
import { previewCoupon } from "@/lib/services/coupons";
import { effectivePrice } from "@/lib/deals";
import { codCapableProviderActive, getShippingOptionsFor } from "@/lib/shipping/registry";
import { CheckoutClient } from "./checkout-client";
import { GuestCheckoutClient } from "./guest-checkout-client";

// Private page: give it its own tab title (and keep it out of search results).
export const metadata = { title: "Checkout", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ item?: string; items?: string; guest?: string; qty?: string }> }) {
  const session = await auth();
  const { item, items: itemsParam, guest, qty } = await searchParams;

  // A logged-out "Buy Now" click lands here instead of erroring — offer
  // guest checkout (or a way to log in) rather than forcing account
  // creation to buy. Scoped to a single product/seller; the cart-based flow
  // below still requires an account, since Cart.userId is required.
  if (!session?.user && guest) {
    const product = await prisma.product.findUnique({ where: { id: guest }, include: { seller: true } });
    if (!product || product.status !== "ACTIVE" || product.listingType === "AUCTION") redirect("/cart");
    const quantity = Math.max(1, Math.min(product.quantityAvailable, parseInt(qty ?? "1", 10) || 1));
    const unitPrice = effectivePrice(product);
    const shippingOptions = product.isDigital ? [] : await getShippingOptionsFor({ declaredValue: unitPrice * quantity });

    return (
      <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6">
        <h1 className="mb-5 text-2xl font-extrabold text-ink-900">Checkout</h1>
        <GuestCheckoutClient
          product={{
            id: product.id,
            title: product.title,
            image: (product.images as string[])[0],
            unitPrice,
            seller: product.seller.shopName,
            isDigital: product.isDigital,
          }}
          quantity={quantity}
          shippingOptions={shippingOptions}
        />
      </div>
    );
  }

  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent("/checkout")}`);
  const ids = item ? [item] : itemsParam ? itemsParam.split(",") : [];
  if (ids.length === 0) redirect("/cart");

  const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } });
  const cartItems = await prisma.cartItem.findMany({
    where: { id: { in: ids }, cartId: cart?.id },
    include: { product: { include: { seller: true } } },
  });
  if (cartItems.length === 0) redirect("/cart");

  const address = await prisma.address.findFirst({ where: { userId: session.user.id }, orderBy: { isDefault: "desc" } });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  const shipEligible = cartItems.every((i) => i.product.shippingAvailable);

  const pickupEligible = cartItems.every((i) => i.product.pickupAvailable && i.product.seller.pickupAvailable);
  const pickupSellers = pickupEligible
    ? Array.from(new Map(cartItems.map((i) => [i.product.seller.id, i.product.seller])).values()).map((s) => ({
        shopName: s.shopName,
        area: s.province ?? null,
        pickupInstructions: s.pickupInstructions ?? null,
      }))
    : [];
  // "Store Pickup" for a BIR-verified Shop, "Local Pickup" for a casual
  // Closet/Yard Sale seller (who can't be birVerified-gated My Shop by
  // definition — see createProductAction) — mixed carts fall back to the
  // more neutral "Store Pickup" label.
  const pickupLabel = pickupEligible && cartItems.every((i) => !i.product.seller.birVerified) ? "Local Pickup" : "Store Pickup";

  const buyerArea = await getSelectedArea();
  const localDeliveryEligible =
    !!buyerArea &&
    cartItems.every((i) => {
      const areas = (i.product.localDeliveryAreas as string[] | null) ?? (i.product.seller.localDeliveryAreas as string[]);
      return i.product.localDeliveryAvailable && i.product.seller.localDeliveryAvailable && areas.includes(buyerArea);
    });
  const localDeliveryFee = localDeliveryEligible
    ? Math.max(...cartItems.map((i) => i.product.seller.localDeliveryFee ?? 0))
    : 0;

  const allDigital = cartItems.every((i) => i.product.isDigital);

  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const welcomeCoupon = await previewCoupon(session.user.id, cartSubtotal);
  const shippingOptions = shipEligible ? await getShippingOptionsFor({ declaredValue: cartSubtotal }) : [];

  // ---------- Bottom-of-checkout recommendations ----------
  const cartProductIds = cartItems.map((i) => i.productId);
  const sellerIds = [...new Set(cartItems.map((i) => i.product.sellerId))];

  const [moreFromSellers, becauseYouLookedAt, basedOnSearches, trending] = await Promise.all([
    prisma.product.findMany({
      where: { sellerId: { in: sellerIds }, status: "ACTIVE", id: { notIn: cartProductIds } },
      include: { seller: true, auction: true },
      orderBy: { likeCount: "desc" },
      take: 10,
    }),
    getBecauseYouLookedAt(session.user.id, 10),
    getBasedOnYourSearches(session.user.id, 10),
    getTrendingProducts({ limit: 10 }),
  ]);

  const youMightLike = becauseYouLookedAt.products.length > 0
    ? becauseYouLookedAt.products
    : trending.filter((p) => !cartProductIds.includes(p.id));

  const [recSavedIds, recSocialProof] = await Promise.all([
    getSavedProductIdSet(session.user.id),
    getSocialProofMap(
      [...moreFromSellers, ...youMightLike, ...basedOnSearches.products].map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))
    ),
  ]);

  const cardOpts = (id: string) => ({ isSaved: recSavedIds.has(id), socialProof: recSocialProof.get(id) });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6">
      <h1 className="mb-5 text-2xl font-extrabold text-ink-900">Checkout</h1>
      <CheckoutClient
        items={cartItems.map((i) => ({
          id: i.id,
          title: i.product.title,
          image: (i.product.images as string[])[0],
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          seller: i.product.seller.shopName,
          sellerId: i.product.sellerId,
          personalizationNote: i.personalizationNote,
        }))}
        defaultShipping={{
          name: address?.fullName ?? user?.name ?? "",
          phone: address?.phone ?? user?.phone ?? "",
          address: address?.line1 ?? "",
          city: address?.city ?? "",
          province: address?.province ?? "",
          postalCode: address?.postalCode ?? "",
        }}
        shipEligible={shipEligible}
        pickupEligible={pickupEligible}
        pickupSellers={pickupSellers}
        pickupLabel={pickupLabel}
        localDeliveryEligible={localDeliveryEligible}
        localDeliveryFee={localDeliveryFee}
        allDigital={allDigital}
        codEligible={codCapableProviderActive()}
        shippingOptions={shippingOptions}
        welcomeCoupon={welcomeCoupon ? { code: welcomeCoupon.code, discountAmount: welcomeCoupon.discountAmount } : null}
        recommendations={{
          moreFromSellers: moreFromSellers.map((p) => toProductCardData(p, cardOpts(p.id))),
          youMightLike: youMightLike.map((p) => toProductCardData(p, cardOpts(p.id))),
          basedOnSearches: basedOnSearches.products.map((p) => toProductCardData(p, cardOpts(p.id))),
        }}
      />
    </div>
  );
}
