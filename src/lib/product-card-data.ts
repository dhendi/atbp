import type { ProductCardData } from "@/components/domain/product-card";
import type { SocialProofData } from "@/lib/services/social-proof";

// The shape every page's Prisma query needs (`include: { seller: true, auction: true }`)
// to build a fully correct ProductCardData. Centralized here so a listing/auction/deal
// field never again goes missing on just one page while the others stay correct.
interface ProductLike {
  id: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  images: unknown;
  type: string;
  condition: string;
  quantity: number;
  quantityAvailable?: number;
  likeCount: number;
  status: string;
  listingType: string;
  dealPrice: number | null;
  dealStartAt: Date | string | null;
  dealEndAt: Date | string | null;
  shippingAvailable?: boolean;
  pickupAvailable?: boolean;
  isDigital?: boolean;
  madeToOrder?: boolean;
  isFood?: boolean;
  shelfStable?: boolean;
  closetId?: string | null;
  yardSaleId?: string | null;
  seller: { shopName: string; handle: string; rating: number; foundingSeller?: boolean; birVerified?: boolean; verified?: boolean; isSampleContent?: boolean };
  auction?: {
    currentBid: number;
    bidCount: number;
    endAt: Date | string;
    startAt: Date | string;
    startingBid: number;
    status: string;
  } | null;
}

export function toProductCardData(
  p: ProductLike,
  opts?: { trending?: boolean; isSaved?: boolean; socialProof?: SocialProofData }
): ProductCardData {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    images: p.images as string[],
    type: p.type,
    condition: p.condition,
    quantity: p.quantity,
    quantityAvailable: p.quantityAvailable,
    likeCount: p.likeCount,
    status: p.status,
    listingType: p.listingType,
    dealPrice: p.dealPrice,
    dealStartAt: p.dealStartAt,
    dealEndAt: p.dealEndAt,
    shippingAvailable: p.shippingAvailable,
    pickupAvailable: p.pickupAvailable,
    isDigital: p.isDigital,
    madeToOrder: p.madeToOrder,
    isFood: p.isFood,
    shelfStable: p.shelfStable,
    closetId: p.closetId,
    yardSaleId: p.yardSaleId,
    auction: p.auction ?? null,
    trending: opts?.trending,
    isSaved: opts?.isSaved,
    socialProof: opts?.socialProof,
    seller: {
      shopName: p.seller.shopName,
      handle: p.seller.handle,
      rating: p.seller.rating,
      foundingSeller: p.seller.foundingSeller,
      birVerified: p.seller.birVerified,
      verified: p.seller.verified,
      isSampleContent: p.seller.isSampleContent,
    },
  };
}
