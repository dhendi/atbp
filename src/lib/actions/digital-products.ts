"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/services/orders";
import { assertCanCreateListing, assertCanActivateListings } from "@/lib/services/seller-plan";
import { assertCanAddCasualListing } from "@/lib/services/casual-listings";
import { issueDigitalDownloadTokens } from "@/lib/services/digital-products";
import { sellerInactiveMessage, idVerificationBlockMessage } from "@/lib/constants";
import { effectivePrice } from "@/lib/deals";
import type { PaymentMethodId } from "@/lib/payments/provider";
import { listingTitleDescriptionSchema, productMoneySchema, productDescriptionSchema, firstIssue } from "@/lib/validation";

async function requireSeller() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
}

export interface DigitalProductInput {
  title: string;
  description: string;
  categoryId: string;
  images: string[];
  fileUrls: string[];
  price: number;
  deliveryInstructions?: string;
  rightsAttested: boolean;
}

export async function createDigitalProductAction(input: DigitalProductInput) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account. Set one up from Sell on ATBP first." };
  const inactiveMessage = sellerInactiveMessage(seller.status);
  if (inactiveMessage) return { error: inactiveMessage };
  const idBlockMessage = idVerificationBlockMessage(seller);
  if (idBlockMessage) return { error: idBlockMessage };

  if (!input.rightsAttested) return { error: "Please confirm you own or are licensed to sell this." };
  if (input.images.length === 0) return { error: "Add at least one preview image." };
  if (input.fileUrls.length === 0) return { error: "Upload at least one file for buyers to download." };

  const titleDescResult = listingTitleDescriptionSchema.safeParse({ title: input.title, description: input.description });
  if (!titleDescResult.success) return { error: firstIssue(titleDescResult) };
  input.title = titleDescResult.data.title;
  input.description = titleDescResult.data.description;

  const priceResult = productMoneySchema.safeParse(input.price);
  if (!priceResult.success) return { error: firstIssue(priceResult) };
  input.price = priceResult.data;

  if (input.deliveryInstructions) {
    const instructionsResult = productDescriptionSchema.safeParse(input.deliveryInstructions);
    if (!instructionsResult.success) return { error: firstIssue(instructionsResult) };
    input.deliveryInstructions = instructionsResult.data;
  }

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) return { error: "Choose a valid category." };

  if (seller.birVerified) {
    const quota = await assertCanCreateListing(seller.id);
    if (!quota.allowed) return { error: quota.error };
    const activate = await assertCanActivateListings(seller.id);
    if (!activate.allowed) return { error: activate.error };
  } else {
    const cap = await assertCanAddCasualListing(seller.id);
    if (!cap.allowed) return { error: cap.error };
  }

  const product = await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      images: input.images,
      price: input.price,
      quantity: 999_999,
      quantityAvailable: 999_999,
      type: "CUSTOM",
      condition: "BRAND_NEW",
      sellingModes: ["BUY_NOW"],
      listingType: "FIXED",
      status: "ACTIVE",
      shippingAvailable: false,
      isDigital: true,
      digitalDeliveryInstructions: input.deliveryInstructions || null,
      digitalFileUrls: input.fileUrls,
      kind: "DIGITAL_PRODUCT",
      rightsAttestedAt: new Date(),
    },
  });

  revalidatePath("/studio/products");
  revalidatePath("/services");
  return { success: true, productId: product.id };
}

/** Instant-delivery purchase — no cart, no guest checkout, logged-in only,
 * same single-item scope boundary as orderServiceAction. Download tokens are
 * issued immediately; the seller's funds sit on hold for
 * DIGITAL_PRODUCT_HOLD_DAYS (see lib/services/digital-products.ts) before
 * becoming payout-eligible. */
export async function orderDigitalProductAction(
  productId: string,
  buyerContact: { name: string; phone: string },
  paymentMethod: PaymentMethodId
) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (paymentMethod === "COD") return { error: "Digital products are prepaid only." };

  const product = await prisma.product.findUnique({ where: { id: productId }, include: { seller: true } });
  if (!product || product.status !== "ACTIVE" || product.kind !== "DIGITAL_PRODUCT") return { error: "This item isn't available right now." };
  if (product.seller.userId === session.user.id) return { error: "You can't buy your own listing." };

  const order = await createOrder({
    buyerId: session.user.id,
    sellerId: product.sellerId,
    items: [{
      productId: product.id,
      title: product.title,
      imageUrl: (product.images as string[])[0] ?? "",
      unitPrice: effectivePrice(product),
      quantity: 1,
      sourceType: "BUY_NOW",
    }],
    shipping: { name: buyerContact.name, phone: buyerContact.phone, address: "Digital delivery, no shipping address", city: "—", province: "—", postalCode: "—" },
    paymentMethod,
    fulfillmentMethod: "DIGITAL_PRODUCT",
    buyerProtectionOptIn: false,
  });

  await issueDigitalDownloadTokens(order.items.map((i) => i.id));

  return { success: true, orderId: order.id };
}

/** Powers the "Download" buttons on an order's detail page — never returns
 * Product.digitalFileUrls itself, only the token-gated route URL. */
export async function getDigitalDownloadLinksAction(orderId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true, digitalDownloadTokens: true } } },
  });
  if (!order || order.buyerId !== session.user.id) return { error: "Not authorized." };

  return {
    success: true as const,
    items: order.items
      .filter((i) => i.product.kind === "DIGITAL_PRODUCT")
      .map((i) => {
        const token = i.digitalDownloadTokens[0];
        const fileUrls = (i.product.digitalFileUrls as string[] | null) ?? [];
        return {
          title: i.title,
          files: token
            ? fileUrls.map((_, idx) => ({ index: idx, url: `/api/downloads/${token.token}?file=${idx}` }))
            : [],
        };
      }),
  };
}
