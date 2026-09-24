"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logProductEvent } from "@/lib/trending";
import { isBlockedBetween } from "@/lib/actions/moderation";
import { notify } from "@/lib/services/notifications";
import { notifyFollowersOfAnnouncement } from "@/lib/services/follow-notifications";
import { effectivePrice } from "@/lib/deals";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { isValidArea } from "@/lib/local-shared";
import { safeHttpsUrl } from "@/lib/safe-url";
import { messageContentSchema, reportInputSchema, sellerIdVerificationInputSchema, businessLicenseInputSchema, firstIssue } from "@/lib/validation";

const MESSAGE_RATE_LIMIT = 10; // max messages per user per thread per rolling minute
const MESSAGE_RATE_WINDOW_MS = 60_000;

async function isRateLimited(threadId: string, senderId: string) {
  const count = await prisma.message.count({
    where: { threadId, senderId, createdAt: { gte: new Date(Date.now() - MESSAGE_RATE_WINDOW_MS) } },
  });
  return count >= MESSAGE_RATE_LIMIT;
}

export async function toggleSaveProductAction(productId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const existing = await prisma.savedProduct.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });

  if (existing) {
    await prisma.savedProduct.delete({ where: { id: existing.id } });
    await prisma.product.update({ where: { id: productId }, data: { likeCount: { decrement: 1 } } });
    return { saved: false };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "This product no longer exists." };

  await prisma.savedProduct.create({ data: { userId: session.user.id, productId, priceAtSave: effectivePrice(product) } });
  await prisma.product.update({ where: { id: productId }, data: { likeCount: { increment: 1 } } });
  await logProductEvent(productId, "SAVE", session.user.id);
  return { saved: true };
}

export async function reportContentAction(input: {
  targetType: "PRODUCT" | "LIVESTREAM" | "USER" | "SELLER";
  productId?: string;
  livestreamId?: string;
  targetLabel: string;
  reason: string;
  details?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (!(await checkRateLimit(`report:${session.user.id}`, 5, 60_000))) {
    return { error: "Too many reports. Please wait a moment before submitting another." };
  }

  const reportResult = reportInputSchema.safeParse({ targetLabel: input.targetLabel, reason: input.reason, details: input.details });
  if (!reportResult.success) return { error: firstIssue(reportResult) };
  input.targetLabel = reportResult.data.targetLabel;
  input.reason = reportResult.data.reason;
  input.details = reportResult.data.details;

  if (input.productId) {
    const existing = await prisma.report.findUnique({
      where: { reporterId_productId: { reporterId: session.user.id, productId: input.productId } },
    });
    if (existing) return { error: "You've already reported this." };
  }

  try {
    await prisma.report.create({
      data: {
        reporterId: session.user.id,
        targetType: input.targetType,
        productId: input.productId,
        livestreamId: input.livestreamId,
        targetLabel: input.targetLabel,
        reason: input.reason,
        details: input.details,
      },
    });
  } catch {
    // Unique constraint race (two submits landing at once) — same outcome as the pre-check above.
    return { error: "You've already reported this." };
  }
  revalidatePath("/admin/reports");
  return { success: true };
}

export async function sendMessageAction(sellerId: string, body: string, imageUrl?: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (!body.trim() && !imageUrl) return { error: "Message can't be empty." };
  if (body.trim()) {
    const bodyResult = messageContentSchema.safeParse(body);
    if (!bodyResult.success) return { error: firstIssue(bodyResult) };
    body = bodyResult.data;
  }

  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return { error: "Seller not found." };
  if (await isBlockedBetween(session.user.id, seller.userId)) {
    return { error: "You can't message this seller." };
  }

  const thread = await prisma.messageThread.upsert({
    where: { buyerId_sellerId: { buyerId: session.user.id, sellerId } },
    update: {},
    create: { buyerId: session.user.id, sellerId },
  });

  if (await isRateLimited(thread.id, session.user.id)) {
    return { error: "You're sending messages too quickly. Please slow down." };
  }

  await prisma.message.create({ data: { threadId: thread.id, senderId: session.user.id, body, imageUrl } });
  await notify(seller.userId, "NEW_MESSAGE", "New message", `${session.user.name} sent you a message.`, `/messages/${thread.id}`);
  revalidatePath(`/messages/${thread.id}`);
  revalidatePath("/messages");
  return { success: true, threadId: thread.id };
}

export async function sendThreadMessageAction(threadId: string, body: string, imageUrl?: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (!body.trim() && !imageUrl) return { error: "Message can't be empty." };
  if (body.trim()) {
    const bodyResult = messageContentSchema.safeParse(body);
    if (!bodyResult.success) return { error: firstIssue(bodyResult) };
    body = bodyResult.data;
  }

  const thread = await prisma.messageThread.findUnique({ where: { id: threadId }, include: { seller: true, buyer: true } });
  if (!thread) return { error: "Thread not found." };
  const isParticipant = thread.buyerId === session.user.id || thread.seller.userId === session.user.id;
  if (!isParticipant) return { error: "Not authorized." };

  const recipientUserId = session.user.id === thread.buyerId ? thread.seller.userId : thread.buyerId;
  if (await isBlockedBetween(session.user.id, recipientUserId)) {
    return { error: "You can't message this user." };
  }
  if (await isRateLimited(threadId, session.user.id)) {
    return { error: "You're sending messages too quickly. Please slow down." };
  }

  await prisma.message.create({ data: { threadId, senderId: session.user.id, body, imageUrl } });
  await notify(recipientUserId, "NEW_MESSAGE", "New message", `${session.user.name} sent you a message.`, `/messages/${threadId}`);
  revalidatePath(`/messages/${threadId}`);
  return { success: true };
}

// Testing convenience — hard-deletes a message you sent. No "unsend" window or
// edited-message trail; this is for cleaning up test conversations, not a
// polished chat feature.
// Testing convenience — hard-deletes an entire conversation (and every message
// in it, via cascade) for both participants. No archive, no undo.
export async function deleteThreadAction(threadId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const thread = await prisma.messageThread.findUnique({ where: { id: threadId }, include: { seller: true } });
  if (!thread) return { error: "Thread not found." };
  const isParticipant = thread.buyerId === session.user.id || thread.seller.userId === session.user.id;
  if (!isParticipant) return { error: "Not authorized." };

  await prisma.messageThread.delete({ where: { id: threadId } });
  revalidatePath("/messages");
  return { success: true };
}

export async function deleteMessageAction(messageId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return { error: "Message not found." };
  if (message.senderId !== session.user.id) return { error: "You can only delete your own messages." };

  await prisma.message.delete({ where: { id: messageId } });
  revalidatePath(`/messages/${message.threadId}`);
  return { success: true };
}

export async function updateSellerProfileAction(input: {
  shopName: string;
  description: string;
  bannerUrl?: string;
  logoUrl?: string;
  province: string;
  announcement?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
  returnPolicy?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "Not authorized." };

  if (!isValidArea(input.province)) return { error: "Please choose a valid city from the picker." };

  const shopName = String(input.shopName ?? "").trim();
  if (!shopName || shopName.length > 80) return { error: "Shop name must be between 1 and 80 characters." };
  if (String(input.description ?? "").length > 2000) return { error: "Description is too long (2000 characters max)." };
  if ((input.announcement?.length ?? 0) > 500) return { error: "Announcement is too long (500 characters max)." };
  if ((input.returnPolicy?.length ?? 0) > 2000) return { error: "Return policy is too long (2000 characters max)." };

  // These end up in href/src attributes on the public shop page, so only
  // plain https URLs are accepted: a javascript: link stored here would run
  // script on our origin for every visitor who clicked it.
  let bannerUrl: string | undefined;
  let logoUrl: string | undefined;
  if (input.bannerUrl) {
    const safe = safeHttpsUrl(input.bannerUrl);
    if (!safe) return { error: "The banner image link isn't valid." };
    bannerUrl = safe;
  }
  if (input.logoUrl) {
    const safe = safeHttpsUrl(input.logoUrl);
    if (!safe) return { error: "The logo image link isn't valid." };
    logoUrl = safe;
  }
  const socialLinks: Record<string, string> = {};
  for (const key of ["facebook", "instagram", "tiktok"] as const) {
    const raw = input.socialLinks?.[key];
    if (!raw || !raw.trim()) continue;
    const safe = safeHttpsUrl(raw);
    if (!safe) return { error: `The ${key} link must be a full https:// address.` };
    socialLinks[key] = safe;
  }

  const newAnnouncement = input.announcement?.trim() || null;
  const announcementChanged = !!newAnnouncement && newAnnouncement !== seller.announcement;

  await prisma.sellerProfile.update({
    where: { id: seller.id },
    data: {
      shopName,
      description: input.description,
      bannerUrl,
      logoUrl,
      province: input.province,
      announcement: newAnnouncement,
      socialLinks,
      returnPolicy: input.returnPolicy?.trim() || null,
    },
  });
  if (announcementChanged) {
    await notifyFollowersOfAnnouncement(seller.id, input.shopName, seller.handle, newAnnouncement!);
  }
  revalidatePath("/studio/settings");
  revalidatePath(`/seller/${seller.handle}`);
  return { success: true };
}

/** Sellers curate a small "featured" shelf on their own shop page. */
export async function toggleProductFeaturedAction(productId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "Not authorized." };

  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.id } });
  if (!product) return { error: "Product not found." };

  if (!product.featured) {
    const featuredCount = await prisma.product.count({ where: { sellerId: seller.id, featured: true } });
    if (featuredCount >= 6) return { error: "You can feature up to 6 products at a time." };
  }

  const updated = await prisma.product.update({ where: { id: productId }, data: { featured: !product.featured } });
  revalidatePath(`/seller/${seller.handle}`);
  revalidatePath("/studio/products");
  return { success: true, featured: updated.featured };
}

export async function becomeSellerAction(input: {
  shopName: string;
  handle: string;
  description: string;
  province: string;
  sellerKind: "INDIVIDUAL" | "BUSINESS";
  birRegistrationNumber?: string;
  businessLicenseUrl?: string;
  idDocumentType: string;
  idDocumentUrl: string;
  selfiePhotoUrl: string;
  primaryCategories: string[]; // official Category slugs
  customCategoryTags?: string[]; // "Other" freeform tags, sent for admin review — never blocks onboarding
}) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const existing = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (existing) return { error: "You already have a seller profile." };

  const handleTaken = await prisma.sellerProfile.findUnique({ where: { handle: input.handle } });
  if (handleTaken) return { error: "That shop handle is already taken." };

  if (!isValidArea(input.province)) return { error: "Please choose a valid city from the picker." };

  const idResult = sellerIdVerificationInputSchema.safeParse({ idDocumentType: input.idDocumentType, idDocumentUrl: input.idDocumentUrl, selfiePhotoUrl: input.selfiePhotoUrl });
  if (!idResult.success) return { error: firstIssue(idResult) };

  if (input.sellerKind === "BUSINESS" && !input.birRegistrationNumber?.trim()) {
    return { error: "Please enter your BIR Certificate of Registration number." };
  }
  if (input.sellerKind === "BUSINESS") {
    const licenseResult = businessLicenseInputSchema.safeParse(input.businessLicenseUrl);
    if (!licenseResult.success) return { error: firstIssue(licenseResult) };
  }

  const customTags = (input.customCategoryTags ?? []).map((t) => t.trim()).filter(Boolean);
  if (input.primaryCategories.length === 0 && customTags.length === 0) {
    return { error: "Please choose at least one category for what you primarily sell." };
  }

  const seller = await prisma.sellerProfile.create({
    data: {
      userId: session.user.id,
      shopName: input.shopName,
      handle: input.handle,
      description: input.description,
      province: input.province,
      sellerKind: input.sellerKind,
      birRegistrationNumber: input.sellerKind === "BUSINESS" ? input.birRegistrationNumber!.trim() : null,
      businessLicenseUrl: input.sellerKind === "BUSINESS" ? input.businessLicenseUrl!.trim() : null,
      idDocumentType: idResult.data.idDocumentType,
      idDocumentUrl: idResult.data.idDocumentUrl,
      selfiePhotoUrl: idResult.data.selfiePhotoUrl,
      idSubmittedAt: new Date(),
      primaryCategories: input.primaryCategories,
      status: "PENDING",
    },
  });
  if (customTags.length > 0) {
    await prisma.categoryTagSuggestion.createMany({
      data: customTags.map((tag) => ({ sellerId: seller.id, tag })),
    });
  }
  // Never downgrade an ADMIN account to SELLER — see closet.ts's
  // becomeClosetSellerAction for why.
  if (session.user.role !== "ADMIN") {
    await prisma.user.update({ where: { id: session.user.id }, data: { role: "SELLER" } });
  }

  return { success: true };
}

/** Editable later from Studio > Shop Settings — same rules as onboarding
 * (at least one official category or custom tag required), just without the
 * account-creation side effects. */
export async function updatePrimaryCategoriesAction(input: { primaryCategories: string[]; customCategoryTags?: string[] }) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "You need a seller account." };

  const customTags = (input.customCategoryTags ?? []).map((t) => t.trim()).filter(Boolean);
  if (input.primaryCategories.length === 0 && customTags.length === 0) {
    return { error: "Please choose at least one category for what you primarily sell." };
  }

  await prisma.sellerProfile.update({ where: { id: seller.id }, data: { primaryCategories: input.primaryCategories } });
  if (customTags.length > 0) {
    await prisma.categoryTagSuggestion.createMany({
      data: customTags.map((tag) => ({ sellerId: seller.id, tag })),
    });
  }

  revalidatePath("/studio/settings");
  return { success: true };
}
