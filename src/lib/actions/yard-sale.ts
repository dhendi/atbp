"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidArea } from "@/lib/local-shared";
import { yardSaleItemCountWarning, expireOverdueYardSales, YARD_SALE_MAX_DAYS } from "@/lib/services/yard-sale";
import { sellerInactiveMessage, idVerificationBlockMessage, type Condition } from "@/lib/constants";
import { productTitleSchema, productDescriptionSchema, productMoneySchema, sellerIdVerificationInputSchema, firstIssue } from "@/lib/validation";

async function requireSeller() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
}

function validateDateRange(startDate: string, endDate: string): string | null {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Pick valid start and end dates.";
  if (end <= start) return "The end date must be after the start date.";
  const days = (end.getTime() - start.getTime()) / 86400000;
  if (days > YARD_SALE_MAX_DAYS) return `A Yard Sale can run for up to ${YARD_SALE_MAX_DAYS} days.`;
  return null;
}

interface CasualOnboardingInput {
  shopName: string;
  handle: string;
  province: string;
  description?: string;
  primaryCategories: string[];
  customCategoryTags?: string[];
  idDocumentType: string;
  idDocumentUrl: string;
  selfiePhotoUrl: string;
}

interface YardSaleFields {
  title: string;
  city?: string;
  description?: string;
  startDate: string;
  endDate: string;
}

/** Creates the SellerProfile + first Yard Sale together for a brand-new
 * casual seller. Auto-approved, same as My Closet. */
export async function becomeYardSaleSellerAction(input: CasualOnboardingInput & YardSaleFields) {
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
  const dateError = validateDateRange(input.startDate, input.endDate);
  if (dateError) return { error: dateError };

  const titleResult = productTitleSchema.safeParse(input.title);
  if (!titleResult.success) return { error: firstIssue(titleResult) };
  input.title = titleResult.data;
  if (input.description) {
    const descriptionResult = productDescriptionSchema.safeParse(input.description);
    if (!descriptionResult.success) return { error: firstIssue(descriptionResult) };
    input.description = descriptionResult.data;
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
  // Never downgrade an ADMIN account to SELLER — see closet.ts's
  // becomeClosetSellerAction for why.
  if (session.user.role !== "ADMIN") {
    await prisma.user.update({ where: { id: session.user.id }, data: { role: "SELLER" } });
  }

  const yardSale = await prisma.yardSale.create({
    data: {
      sellerId: seller.id,
      title: input.title,
      city: input.city ?? input.province,
      description: input.description || null,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    },
  });

  updateTag("yard-sales");
  return { success: true, yardSaleId: yardSale.id };
}

/** For an existing seller (already has a SellerProfile, e.g. via Closet or
 * Shop) starting a Yard Sale — first one, or a new one after their last
 * ended. Only one ACTIVE Yard Sale per seller at a time. */
export async function createYardSaleAction(input: YardSaleFields) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account first." };

  await expireOverdueYardSales();
  const activeExisting = await prisma.yardSale.findFirst({ where: { sellerId: seller.id, status: "ACTIVE" } });
  if (activeExisting) return { error: "You already have an active Yard Sale. Close it early if you want to start a new one now." };

  const dateError = validateDateRange(input.startDate, input.endDate);
  if (dateError) return { error: dateError };

  const titleResult = productTitleSchema.safeParse(input.title);
  if (!titleResult.success) return { error: firstIssue(titleResult) };
  input.title = titleResult.data;
  if (input.description) {
    const descriptionResult = productDescriptionSchema.safeParse(input.description);
    if (!descriptionResult.success) return { error: firstIssue(descriptionResult) };
    input.description = descriptionResult.data;
  }

  const yardSale = await prisma.yardSale.create({
    data: {
      sellerId: seller.id,
      title: input.title,
      city: input.city ?? seller.province,
      description: input.description || null,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    },
  });
  revalidatePath("/studio/yard-sale");
  updateTag("yard-sales");
  return { success: true, yardSaleId: yardSale.id };
}

/** Manually ends an active Yard Sale early — archives it and its listings,
 * same as natural expiry, so the seller can start a fresh one right away. */
export async function closeYardSaleEarlyAction(yardSaleId: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  const yardSale = await prisma.yardSale.findFirst({ where: { id: yardSaleId, sellerId: seller.id, status: "ACTIVE" } });
  if (!yardSale) return { error: "Yard Sale not found." };

  await prisma.yardSale.update({ where: { id: yardSaleId }, data: { status: "CLOSED_EARLY" } });
  await prisma.product.updateMany({ where: { yardSaleId, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
  revalidatePath("/studio/yard-sale");
  updateTag("yard-sales");
  updateTag("products");
  return { success: true };
}

export interface YardSaleItemInput {
  images: string[];
  categoryId: string;
  condition: Condition;
  price: number;
  city?: string;
}

export async function createYardSaleItemAction(input: YardSaleItemInput) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  const inactiveMessage = sellerInactiveMessage(seller.status);
  if (inactiveMessage) return { error: inactiveMessage };
  const idBlockMessage = idVerificationBlockMessage(seller);
  if (idBlockMessage) return { error: idBlockMessage };

  await expireOverdueYardSales();
  const yardSale = await prisma.yardSale.findFirst({ where: { sellerId: seller.id, status: "ACTIVE" } });
  if (!yardSale) return { error: "You don't have an active Yard Sale." };

  if (input.images.length === 0) return { error: "Add at least one photo." };
  if (!input.categoryId) return { error: "Choose what it is." };
  const priceResult = productMoneySchema.safeParse(input.price);
  if (!priceResult.success) return { error: firstIssue(priceResult) };
  input.price = priceResult.data;

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) return { error: "Choose a valid category." };

  const warning = await yardSaleItemCountWarning(yardSale.id);

  await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: input.categoryId,
      title: category.name,
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
      yardSaleId: yardSale.id,
    },
  });

  revalidatePath("/studio/yard-sale");
  updateTag("products");
  updateTag("yard-sales");
  return { success: true, warning };
}

export async function removeYardSaleItemAction(productId: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.id, yardSaleId: { not: null } } });
  if (!product) return { error: "Item not found." };

  await prisma.product.update({ where: { id: productId }, data: { status: "REMOVED" } });
  revalidatePath("/studio/yard-sale");
  updateTag("products");
  updateTag("yard-sales");
  return { success: true };
}
