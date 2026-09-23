"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidArea } from "@/lib/local-shared";
import { assertCanAddClosetItem } from "@/lib/services/closet";
import { sellerInactiveMessage, idVerificationBlockMessage, type Condition } from "@/lib/constants";
import { productTitleSchema, productDescriptionSchema, productMoneySchema, sellerIdVerificationInputSchema, firstIssue } from "@/lib/validation";

async function requireSeller() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
}

interface CasualOnboardingInput {
  shopName: string;
  handle: string;
  province: string; // city, via the PH location system
  description?: string;
  primaryCategories: string[];
  customCategoryTags?: string[];
  idDocumentType: string;
  idDocumentUrl: string;
  selfiePhotoUrl: string;
}

/** Creates the SellerProfile + Closet together for a brand-new casual
 * seller. Unlike My Shop, this is auto-approved — no admin review gate,
 * matching the "as fast as possible" brief for Closet onboarding. */
export async function becomeClosetSellerAction(input: CasualOnboardingInput) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const existing = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (existing) return { error: "You already have a seller profile." };

  const handleTaken = await prisma.sellerProfile.findUnique({ where: { handle: input.handle } });
  if (handleTaken) return { error: "That shop handle is already taken." };
  if (!isValidArea(input.province)) return { error: "Please choose a valid city from the picker." };

  const idResult = sellerIdVerificationInputSchema.safeParse({ idDocumentType: input.idDocumentType, idDocumentUrl: input.idDocumentUrl, selfiePhotoUrl: input.selfiePhotoUrl });
  if (!idResult.success) return { error: firstIssue(idResult) };

  const customTags = (input.customCategoryTags ?? []).map((t) => t.trim()).filter(Boolean);
  if (input.primaryCategories.length === 0 && customTags.length === 0) {
    return { error: "Please choose at least one category for what you primarily sell." };
  }

  const seller = await prisma.sellerProfile.create({
    data: {
      userId: session.user.id,
      shopName: input.shopName,
      handle: input.handle,
      description: input.description || null,
      province: input.province,
      sellerKind: "INDIVIDUAL",
      idDocumentType: idResult.data.idDocumentType,
      idDocumentUrl: idResult.data.idDocumentUrl,
      selfiePhotoUrl: idResult.data.selfiePhotoUrl,
      idSubmittedAt: new Date(),
      primaryCategories: input.primaryCategories,
      status: "APPROVED",
    },
  });
  if (customTags.length > 0) {
    await prisma.categoryTagSuggestion.createMany({ data: customTags.map((tag) => ({ sellerId: seller.id, tag })) });
  }
  // Never downgrade an ADMIN account to SELLER — role is a single field, not
  // a set, so an admin who tests/uses a seller flow on their own account
  // would otherwise silently and permanently lose admin access.
  if (session.user.role !== "ADMIN") {
    await prisma.user.update({ where: { id: session.user.id }, data: { role: "SELLER" } });
  }

  const closet = await prisma.closet.create({
    data: { sellerId: seller.id, title: `${input.shopName}'s Closet`, city: input.province },
  });

  updateTag("closets");
  return { success: true, closetId: closet.id };
}

/** For a seller who already has a SellerProfile (e.g. already runs a Shop or
 * a Yard Sale) and is opening a Closet for the first time. */
export async function openClosetAction(input: { city?: string; description?: string }) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account first." };

  const existing = await prisma.closet.findUnique({ where: { sellerId: seller.id } });
  if (existing) return { error: "You already have a Closet." };

  if (input.description) {
    const descriptionResult = productDescriptionSchema.safeParse(input.description);
    if (!descriptionResult.success) return { error: firstIssue(descriptionResult) };
    input.description = descriptionResult.data;
  }

  const closet = await prisma.closet.create({
    data: {
      sellerId: seller.id,
      title: `${seller.shopName}'s Closet`,
      city: input.city ?? seller.province,
      description: input.description || null,
    },
  });
  revalidatePath("/studio/closet");
  updateTag("closets");
  return { success: true, closetId: closet.id };
}

export async function updateClosetAction(input: { title: string; city?: string; description?: string }) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  const closet = await prisma.closet.findUnique({ where: { sellerId: seller.id } });
  if (!closet) return { error: "You don't have a Closet yet." };

  const titleResult = productTitleSchema.safeParse(input.title);
  if (!titleResult.success) return { error: firstIssue(titleResult) };
  input.title = titleResult.data;
  if (input.description !== undefined) {
    const descriptionResult = productDescriptionSchema.safeParse(input.description);
    if (!descriptionResult.success) return { error: firstIssue(descriptionResult) };
    input.description = descriptionResult.data;
  }

  await prisma.closet.update({
    where: { id: closet.id },
    data: { title: input.title, city: input.city ?? closet.city, description: input.description ?? closet.description },
  });
  revalidatePath("/studio/closet");
  updateTag("closets");
  return { success: true };
}

export interface ClosetItemInput {
  images: string[]; // up to 4, in [front, back, tag, flaws] order — empty slots omitted
  categoryId: string;
  condition: Condition;
  price: number;
  city?: string; // defaults to the Closet's city; editable per item
}

export async function createClosetItemAction(input: ClosetItemInput) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  const inactiveMessage = sellerInactiveMessage(seller.status);
  if (inactiveMessage) return { error: inactiveMessage };
  const idBlockMessage = idVerificationBlockMessage(seller);
  if (idBlockMessage) return { error: idBlockMessage };
  const closet = await prisma.closet.findUnique({ where: { sellerId: seller.id } });
  if (!closet) return { error: "You don't have a Closet yet." };

  if (input.images.length === 0) return { error: "Add at least one photo." };
  if (!input.categoryId) return { error: "Choose what it is." };
  const priceResult = productMoneySchema.safeParse(input.price);
  if (!priceResult.success) return { error: firstIssue(priceResult) };
  input.price = priceResult.data;

  const capCheck = await assertCanAddClosetItem(closet.id);
  if (!capCheck.allowed) return { error: capCheck.error };

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) return { error: "Choose a valid category." };

  const now = new Date();
  await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: input.categoryId,
      title: category.name, // no separate title field in the quick flow — the category name stands in, editable later from the item's own page like any product
      description: "",
      images: input.images,
      price: input.price,
      quantity: 1,
      quantityAvailable: 1,
      type: "PRE_LOVED",
      condition: input.condition,
      sellingModes: ["BUY_NOW"],
      listingType: "FIXED",
      status: "ACTIVE",
      shippingAvailable: true,
      pickupAvailable: true,
      closetId: closet.id,
      closetConfirmedAt: now,
    },
  });

  revalidatePath("/studio/closet");
  updateTag("products");
  updateTag("closets");
  return { success: true };
}

export async function confirmClosetItemAvailableAction(productId: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.id, closetId: { not: null } } });
  if (!product) return { error: "Item not found." };

  await prisma.product.update({ where: { id: productId }, data: { closetConfirmedAt: new Date(), staleNudgeSentAt: null } });
  revalidatePath("/studio/closet");
  updateTag("products");
  return { success: true };
}

export async function removeClosetItemAction(productId: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.id, closetId: { not: null } } });
  if (!product) return { error: "Item not found." };

  await prisma.product.update({ where: { id: productId }, data: { status: "REMOVED" } });
  revalidatePath("/studio/closet");
  updateTag("products");
  updateTag("closets");
  return { success: true };
}
