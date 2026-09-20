"use server";

import { revalidatePath, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanCreateListing, assertCanActivateListings, assertCanStartAuction } from "@/lib/services/seller-plan";
import { notifyFollowersOfNewListing, notifyFollowersOfNewAuction } from "@/lib/services/follow-notifications";
import { notifyWishlistersOfRestock, notifyWishlistersOfPriceDrop } from "@/lib/services/wishlist-notifications";
import { effectivePrice } from "@/lib/deals";
import { autoTagsForProduct } from "@/lib/interests";
import { AUCTIONS_ENABLED } from "@/lib/feature-flags";
import { isSellerInactive, sellerNotApprovedMessage } from "@/lib/constants";
import {
  listingTitleDescriptionSchema,
  productUpdateInputSchema,
  productMoneySchema,
  optionalProductMoneySchema,
  auctionPricingInputSchema,
  firstIssue,
} from "@/lib/validation";

export interface AuctionInput {
  startingBid: number;
  reservePrice?: number | null;
  buyNowPrice?: number | null;
  minIncrement: number;
  startAt?: string | null; // ISO datetime; omit/null to start immediately
  endAt: string; // ISO datetime
}

export interface ProductInput {
  title: string;
  description: string;
  images: string[];
  videoUrl?: string | null;
  price: number;
  compareAtPrice?: number | null;
  quantity: number;
  categoryId: string;
  type: string;
  condition: string;
  sku?: string;
  shippingInfo?: string;
  sellingModes: string[];
  status?: string;
  listingType?: string; // FIXED | AUCTION
  auction?: AuctionInput | null;
  dealPrice?: number | null;
  dealStartAt?: string | null;
  dealEndAt?: string | null;
  shippingAvailable?: boolean;
  pickupAvailable?: boolean;
  localDeliveryAvailable?: boolean;
  localDeliveryAreas?: string[] | null;
  isDigital?: boolean;
  digitalFileUrl?: string | null;
  digitalDeliveryInstructions?: string | null;
  madeToOrder?: boolean;
  productionTimeDays?: number | null;
  customizationOptions?: string[];
  personalizationInstructions?: string | null;
  maxOrderQuantity?: number | null;
  isFood?: boolean;
  shelfStable?: boolean;
  expiryInfo?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  foodShippingNotes?: string | null;
}

async function requireSeller() {
  const session = await auth();
  if (!session?.user) return null;
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  return seller;
}

/** Narrows a product's local-delivery areas to a real subset of the seller's own
 * areas — an empty list or one containing only areas the seller doesn't deliver
 * to collapses to `null` ("every area the seller delivers to"), so a stale/bad
 * value here can never accidentally widen delivery beyond what the seller set up. */
function sanitizeLocalDeliveryAreas(areas: string[] | null | undefined, sellerAreas: unknown): string[] | typeof Prisma.JsonNull {
  if (!areas || areas.length === 0) return Prisma.JsonNull;
  const allowed = new Set(sellerAreas as string[]);
  const narrowed = areas.filter((a) => allowed.has(a));
  return narrowed.length > 0 ? narrowed : Prisma.JsonNull;
}

/** Like requireSeller(), but also rejects a suspended account — taking a
 * listing down (delete/deactivate) is still fine while suspended, creating
 * or (re)activating one is not, which is what this guards. */
async function requireActiveSeller() {
  const seller = await requireSeller();
  if (!seller || isSellerInactive(seller.status)) return null;
  return seller;
}

export async function createProductAction(input: ProductInput) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  const notApprovedMessage = sellerNotApprovedMessage(seller.status);
  if (notApprovedMessage) return { error: notApprovedMessage };
  // My Shop requires BIR verification — a casual seller sells through My
  // Closet or My Yard Sale instead (see lib/actions/closet.ts / yard-sale.ts),
  // which route through their own create actions, never this one.
  if (!seller.birVerified) {
    return { error: "My Shop requires BIR verification. Sell through My Closet or My Yard Sale instead, or get verified from Studio > Plan & Billing." };
  }
  // My Shop already hard-gates on admin approval + BIR verification before any
  // listing can exist, so ID verification gets the same hard block here
  // rather than the grace-period treatment casual selling gets (see
  // idVerificationBlockMessage) — there's no "instant onboarding" promise to
  // preserve on this path.
  if (!seller.idVerified) {
    return { error: "Your ID is still being verified. You'll be able to list once that's approved." };
  }

  const titleDescResult = listingTitleDescriptionSchema.safeParse({ title: input.title, description: input.description });
  if (!titleDescResult.success) return { error: firstIssue(titleDescResult) };
  input.title = titleDescResult.data.title;
  input.description = titleDescResult.data.description;

  const isAuction = input.listingType === "AUCTION";
  if (isAuction && !AUCTIONS_ENABLED) return { error: "Auctions aren't available right now." };
  if (isAuction && (!input.auction || !input.auction.endAt || input.auction.startingBid <= 0)) {
    return { error: "Set a starting bid and an end date for the auction." };
  }
  if (isAuction && new Date(input.auction!.endAt) <= new Date()) {
    return { error: "Auction end time must be in the future." };
  }
  if (isAuction && input.auction!.buyNowPrice && input.auction!.buyNowPrice <= input.auction!.startingBid) {
    return { error: "Buy It Now price must be higher than the starting bid." };
  }
  if (isAuction && input.auction!.startAt && new Date(input.auction!.startAt) >= new Date(input.auction!.endAt)) {
    return { error: "The auction must start before it ends." };
  }
  if (isAuction) {
    const auctionResult = auctionPricingInputSchema.safeParse(input.auction);
    if (!auctionResult.success) return { error: firstIssue(auctionResult) };
    input.auction = { ...input.auction!, ...auctionResult.data };
  } else {
    const priceResult = productMoneySchema.safeParse(input.price);
    if (!priceResult.success) return { error: firstIssue(priceResult) };
    input.price = priceResult.data;

    const compareAtResult = optionalProductMoneySchema.safeParse(input.compareAtPrice);
    if (!compareAtResult.success) return { error: firstIssue(compareAtResult) };
    input.compareAtPrice = compareAtResult.data;

    const dealPriceResult = optionalProductMoneySchema.safeParse(input.dealPrice);
    if (!dealPriceResult.success) return { error: firstIssue(dealPriceResult) };
    input.dealPrice = dealPriceResult.data;
  }

  const willBeActive = (input.status ?? "ACTIVE") === "ACTIVE";

  const listingCheck = await assertCanCreateListing(seller.id);
  if (!listingCheck.allowed) return { error: listingCheck.error };

  if (willBeActive) {
    const activeCheck = await assertCanActivateListings(seller.id, 1);
    if (!activeCheck.allowed) return { error: activeCheck.error };
  }

  if (isAuction && willBeActive) {
    const auctionCheck = await assertCanStartAuction(seller.id);
    if (!auctionCheck.allowed) return { error: auctionCheck.error };
  }

  const images = input.images.length ? input.images : ["https://picsum.photos/seed/" + Date.now() + "/700/700"];
  // Auction listings are one-of-one by construction — inventory logic elsewhere
  // assumes a single winner can purchase, so quantity is always 1.
  const quantity = isAuction ? 1 : input.quantity;
  const isMadeToOrder = !isAuction && !!input.madeToOrder;
  const isDigital = !isAuction && !!input.isDigital;
  const isFood = !isAuction && !!input.isFood;

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  const tags = category
    ? autoTagsForProduct({ type: input.type, categorySlug: category.slug, price: isAuction ? input.auction!.startingBid : input.price })
    : [];
  if (isMadeToOrder) tags.push("made-to-order");

  const product = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      images,
      videoUrl: input.videoUrl ?? null,
      price: isAuction ? input.auction!.startingBid : input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      quantity,
      quantityAvailable: quantity,
      type: input.type,
      condition: input.condition,
      sku: input.sku,
      shippingInfo: input.shippingInfo,
      sellingModes: isAuction ? ["AUCTION"] : input.sellingModes.length ? input.sellingModes : ["BUY_NOW"],
      listingType: isAuction ? "AUCTION" : "FIXED",
      status: input.status ?? "ACTIVE",
      tags,
      dealPrice: !isAuction ? input.dealPrice ?? null : null,
      dealStartAt: !isAuction && input.dealStartAt ? new Date(input.dealStartAt) : null,
      dealEndAt: !isAuction && input.dealEndAt ? new Date(input.dealEndAt) : null,
      shippingAvailable: isDigital ? false : input.shippingAvailable ?? true,
      pickupAvailable: isDigital ? false : input.pickupAvailable ?? false,
      localDeliveryAvailable: isDigital ? false : input.localDeliveryAvailable ?? false,
      localDeliveryAreas:
        !isDigital && input.localDeliveryAvailable
          ? sanitizeLocalDeliveryAreas(input.localDeliveryAreas, seller.localDeliveryAreas)
          : Prisma.JsonNull,
      isDigital,
      digitalFileUrl: isDigital ? input.digitalFileUrl ?? null : null,
      digitalDeliveryInstructions: isDigital ? input.digitalDeliveryInstructions ?? null : null,
      madeToOrder: isMadeToOrder,
      productionTimeDays: isMadeToOrder ? input.productionTimeDays ?? null : null,
      customizationOptions: isMadeToOrder ? input.customizationOptions ?? [] : [],
      personalizationInstructions: isMadeToOrder ? input.personalizationInstructions ?? null : null,
      maxOrderQuantity: input.maxOrderQuantity ?? null,
      isFood,
      shelfStable: isFood ? !!input.shelfStable : false,
      expiryInfo: isFood ? input.expiryInfo ?? null : null,
      ingredients: isFood ? input.ingredients ?? null : null,
      allergens: isFood ? input.allergens ?? null : null,
      foodShippingNotes: isFood ? input.foodShippingNotes ?? null : null,
      ...(isAuction
        ? {
            auction: {
              create: {
                startingBid: input.auction!.startingBid,
                reservePrice: input.auction!.reservePrice ?? null,
                buyNowPrice: input.auction!.buyNowPrice ?? null,
                currentBid: input.auction!.startingBid,
                minIncrement: input.auction!.minIncrement || 50,
                startAt: input.auction!.startAt ? new Date(input.auction!.startAt) : undefined,
                endAt: new Date(input.auction!.endAt),
              },
            },
          }
        : {}),
    },
  });

  if (willBeActive) {
    if (isAuction) await notifyFollowersOfNewAuction(seller.id, product.id, product.title);
    else await notifyFollowersOfNewListing(seller.id, product.id, product.title);
  }

  revalidatePath("/studio/products");
  revalidatePath("/studio/auctions");
  revalidatePath("/auctions");
  updateTag("products");
  return { success: true, product };
}

export async function updateProductAction(productId: string, input: Partial<ProductInput> & { status?: string }) {
  const wantsToActivate = input.status === "ACTIVE";
  const seller = wantsToActivate ? await requireActiveSeller() : await requireSeller();
  if (!seller) return wantsToActivate ? { error: "Your seller account is suspended. You can't activate listings right now." } : { error: "Not authorized." };

  const existing = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.id } });
  if (!existing) return { error: "Product not found." };
  if (existing.listingType === "AUCTION") {
    return { error: "Auction listings can't be edited once created. Manage bids from Studio > Auctions instead." };
  }

  const updateResult = productUpdateInputSchema.safeParse({
    title: input.title,
    description: input.description,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    dealPrice: input.dealPrice,
  });
  if (!updateResult.success) return { error: firstIssue(updateResult) };
  if (input.title !== undefined) input.title = updateResult.data.title;
  if (input.description !== undefined) input.description = updateResult.data.description;
  if (input.price !== undefined) input.price = updateResult.data.price;
  if (input.compareAtPrice !== undefined) input.compareAtPrice = updateResult.data.compareAtPrice ?? null;
  if (input.dealPrice !== undefined) input.dealPrice = updateResult.data.dealPrice ?? null;

  if (input.status === "ACTIVE" && existing.status !== "ACTIVE") {
    const activeCheck = await assertCanActivateListings(seller.id, 1);
    if (!activeCheck.allowed) return { error: activeCheck.error };
  }

  const { auction: _auction, dealStartAt, dealEndAt, localDeliveryAreas, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (dealStartAt !== undefined) data.dealStartAt = dealStartAt ? new Date(dealStartAt) : null;
  if (dealEndAt !== undefined) data.dealEndAt = dealEndAt ? new Date(dealEndAt) : null;
  if (localDeliveryAreas !== undefined || input.localDeliveryAvailable !== undefined) {
    const localDeliveryAvailable = input.localDeliveryAvailable ?? existing.localDeliveryAvailable;
    data.localDeliveryAreas = localDeliveryAvailable
      ? sanitizeLocalDeliveryAreas(localDeliveryAreas ?? (existing.localDeliveryAreas as string[] | null), seller.localDeliveryAreas)
      : Prisma.JsonNull;
  }
  if (input.quantity !== undefined) {
    const diff = input.quantity - existing.quantity;
    data.quantityAvailable = Math.max(0, existing.quantityAvailable + diff);
  }

  const updated = await prisma.product.update({ where: { id: productId }, data });

  if (input.status === "ACTIVE" && existing.status !== "ACTIVE") {
    await notifyFollowersOfNewListing(seller.id, existing.id, existing.title);
  }
  if (updated.quantityAvailable > 0 && existing.quantityAvailable <= 0) {
    await notifyWishlistersOfRestock(existing.id);
  }
  const newEffective = effectivePrice(updated);
  if (newEffective < effectivePrice(existing)) {
    await notifyWishlistersOfPriceDrop(existing.id, newEffective);
  }

  revalidatePath("/studio/products");
  revalidatePath("/studio/deals");
  revalidatePath(`/product/${productId}`);
  revalidatePath("/deals");
  updateTag("products");
  return { success: true };
}

export async function deleteProductAction(productId: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "Not authorized." };

  const existing = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.id } });
  if (!existing) return { error: "Product not found." };

  await prisma.product.update({ where: { id: productId }, data: { status: "REMOVED" } });
  revalidatePath("/studio/products");
  updateTag("products");
  return { success: true };
}

/** Bulk publish/unpublish — fixed-price listings only; auctions can't be edited after creation (see updateProductAction). */
export async function bulkUpdateProductStatusAction(productIds: string[], status: "ACTIVE" | "DRAFT") {
  const seller = status === "ACTIVE" ? await requireActiveSeller() : await requireSeller();
  if (!seller) return status === "ACTIVE" ? { error: "Your seller account is suspended. You can't activate listings right now." } : { error: "Not authorized." };
  if (productIds.length === 0) return { error: "Select at least one product." };

  if (status === "ACTIVE") {
    const toActivate = await prisma.product.count({
      where: { id: { in: productIds }, sellerId: seller.id, listingType: "FIXED", status: { not: "ACTIVE" } },
    });
    if (toActivate > 0) {
      const activeCheck = await assertCanActivateListings(seller.id, toActivate);
      if (!activeCheck.allowed) return { error: activeCheck.error };
    }
  }

  const result = await prisma.product.updateMany({
    where: { id: { in: productIds }, sellerId: seller.id, listingType: "FIXED" },
    data: { status },
  });
  revalidatePath("/studio/products");
  updateTag("products");
  return { success: true, count: result.count };
}

export async function bulkDeleteProductsAction(productIds: string[]) {
  const seller = await requireSeller();
  if (!seller) return { error: "Not authorized." };
  if (productIds.length === 0) return { error: "Select at least one product." };

  const result = await prisma.product.updateMany({
    where: { id: { in: productIds }, sellerId: seller.id },
    data: { status: "REMOVED" },
  });
  revalidatePath("/studio/products");
  updateTag("products");
  return { success: true, count: result.count };
}
