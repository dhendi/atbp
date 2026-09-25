"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { sendPushToUser } from "@/lib/services/push";
import { sendEmail } from "@/lib/services/email";
import { logAdminAction } from "@/lib/services/audit-log";
import { revokeSessions } from "@/lib/services/sessions";
import { anonymizeAccount, getAccountDeletionBlockers } from "@/lib/services/account-deletion";
import { hideSuspendedSellerListings, restoreSellerListings } from "@/lib/services/seller-suspension";
import { maybeGrantFoundingSeller } from "@/lib/services/founding-seller";
import { syncClosetMonthlySalesCap } from "@/lib/services/closet";
import { getStoreClosureBlockers } from "@/lib/services/store-closure";
import { grantFoundingSeller, revokeFoundingSeller, getFoundingSellerAvailability } from "@/lib/services/founding-seller";
import { recomputeSellerRating } from "@/lib/services/reviews";
import { updateOrderStatus } from "@/lib/services/orders";
import { releaseInventory } from "@/lib/services/inventory";
import { reversePromoRedemption } from "@/lib/services/promo";
import { reverseCouponRedemption } from "@/lib/services/coupons";
import { adminReasonSchema, broadcastInputSchema, productTitleSchema, productDescriptionSchema, productMoneySchema, firstIssue } from "@/lib/validation";

// Auto-suspend threshold for the prohibited-items warning flow — 3 active
// warnings holds the account pending manual admin review. Not a permanent
// ban: reinstateSellerAction lifts it, and clearSellerWarningAction can drop
// an individual warning below the threshold. Warnings never expire on their own.
const AUTO_SUSPEND_WARNING_COUNT = 3;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function approveSellerAction(sellerId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  let seller = await prisma.sellerProfile.update({ where: { id: sellerId }, data: { status: "APPROVED" } });
  await logAdminAction(admin.id, "APPROVE_SELLER", "SellerProfile", sellerId, { shopName: seller.shopName });

  // Only actually grants once, and only once every founding condition (approval,
  // BUSINESS seller kind, admin-verified BIR registration) is satisfied — see
  // maybeGrantFoundingSeller. A re-approval after suspension is a no-op here.
  const granted = await maybeGrantFoundingSeller(seller.id);
  if (granted) {
    seller = granted;
    await notify(
      seller.userId,
      "ORDER_CONFIRMED",
      "You're Founding Seller #" + granted.foundingSellerNumber + "!",
      `${seller.shopName} is one of ATBP's first 200 sellers: 8% commission and free Pro for 1 year, no strings attached.`,
      "/studio"
    );
  }

  await notify(seller.userId, "ORDER_CONFIRMED", "You're approved!", `${seller.shopName} is now live on ATBP. Start listing products!`, "/studio");

  if (seller.province) {
    const nearby = await prisma.user.findMany({ where: { area: seller.province, notifyNearbySellers: true }, take: 100 });
    for (const user of nearby) {
      await notify(user.id, "NEARBY_SELLER", `New shop in ${seller.province}`, `${seller.shopName} just joined ATBP near you.`, `/seller/${seller.handle}`);
    }
  }

  revalidatePath("/admin/sellers");
  return { success: true };
}

/**
 * Marks a seller's declared BIR registration as verified — this is a manual
 * admin attestation (checking the actual Certificate of Registration), never
 * automatic. May itself trigger the Founding Seller grant if approval already
 * happened and a slot remains — see maybeGrantFoundingSeller.
 */
export async function verifyBirLicenseAction(sellerId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const before = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!before) return { error: "Seller not found." };
  if (before.sellerKind !== "BUSINESS") return { error: "This seller applied as an individual, not a business." };
  if (!before.birRegistrationNumber) return { error: "No BIR registration number on file for this seller." };
  if (!before.businessLicenseUrl) return { error: "No BIR Certificate of Registration document uploaded for this seller yet." };

  let seller = await prisma.sellerProfile.update({ where: { id: sellerId }, data: { birVerified: true } });
  await logAdminAction(admin.id, "VERIFY_BIR_LICENSE", "SellerProfile", sellerId, { shopName: seller.shopName, birRegistrationNumber: seller.birRegistrationNumber });

  // BIR verification is a real tier upgrade on its own (CASUAL -> BIR_VERIFIED,
  // 10 -> 50 active listings, free, no monthly sales cap) — separate from and
  // not gated by Founding Seller slot availability below. Only move the
  // subscription if the seller is still effectively on FREE; leave a
  // Pro/Premium/Founding subscription untouched.
  const subscription = await prisma.sellerSubscription.findUnique({ where: { sellerId }, include: { plan: true } });
  const onFreeTier = !subscription || subscription.status !== "ACTIVE" || subscription.plan.code === "FREE";
  if (onFreeTier) {
    const birVerifiedPlan = await prisma.sellerPlan.findUnique({ where: { code: "BIR_VERIFIED" } });
    if (birVerifiedPlan) {
      await prisma.sellerSubscription.upsert({
        where: { sellerId },
        update: { planId: birVerifiedPlan.id, status: "ACTIVE", cancelAtPeriodEnd: false },
        create: { sellerId, planId: birVerifiedPlan.id, status: "ACTIVE" },
      });
    }
  }
  // Lifts any Closet monthly-cap pause immediately — no reason to wait for
  // the next order. BIR verification means My Shop is now available too, but
  // this seller's existing Closet (if any) isn't affected beyond the unpause.
  const closet = await prisma.closet.findUnique({ where: { sellerId: seller.id } });
  if (closet) await syncClosetMonthlySalesCap(closet.id);

  const granted = await maybeGrantFoundingSeller(seller.id);
  if (granted) {
    seller = granted;
    await notify(
      seller.userId,
      "ORDER_CONFIRMED",
      "You're Founding Seller #" + granted.foundingSellerNumber + "!",
      `${seller.shopName} is one of ATBP's first 200 sellers: 8% commission and free Pro for 1 year, no strings attached.`,
      "/studio"
    );
  }

  revalidatePath("/admin/sellers");
  return { success: true };
}

/** Records that an admin opened a seller's raw ID/license document — separate
 * from the approve/reject decision, which was already logged. Without this,
 * there was no way to answer "who has actually looked at this person's ID"
 * after the fact, only "who approved/rejected it." Fire-and-forget from the
 * client (see ViewDocumentLink) — a failed log write shouldn't block opening
 * the document, so this never returns an error the caller would act on. */
export async function logDocumentViewAction(sellerId: string, documentKind: string) {
  const admin = await requireAdmin();
  if (!admin) return;
  await logAdminAction(admin.id, "VIEW_SELLER_DOCUMENT", "SellerProfile", sellerId, { documentKind });
}

/** Approve or reject a seller's uploaded ID — separate from verifyBirLicenseAction,
 * which is business-registration verification only. Every seller kind goes
 * through this one, individual and business alike; see idVerificationBlockMessage
 * in lib/constants.ts for how a rejected/pending ID affects their ability to
 * list new items. */
export async function reviewSellerIdAction(sellerId: string, approved: boolean, rejectionReason?: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const before = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!before) return { error: "Seller not found." };
  if (!before.idDocumentUrl) return { error: "No ID document on file for this seller yet." };
  if (before.idVerified) return { error: "This seller's ID is already verified." };

  if (!approved) {
    const reasonResult = adminReasonSchema.safeParse(rejectionReason);
    if (!reasonResult.success) return { error: firstIssue(reasonResult) };
    const seller = await prisma.sellerProfile.update({ where: { id: sellerId }, data: { idRejectedReason: reasonResult.data } });
    await logAdminAction(admin.id, "REJECT_SELLER_ID", "SellerProfile", sellerId, { shopName: seller.shopName, reason: reasonResult.data });
    await notify(seller.userId, "ID_REJECTED", "Your ID needs changes", `We couldn't verify the ID you submitted: ${reasonResult.data}. Resubmit it from Shop Settings.`, "/studio/settings");
    revalidatePath("/admin/sellers");
    revalidatePath(`/admin/sellers/${sellerId}`);
    return { success: true };
  }

  const seller = await prisma.sellerProfile.update({ where: { id: sellerId }, data: { idVerified: true, idVerifiedAt: new Date(), idRejectedReason: null } });
  await logAdminAction(admin.id, "VERIFY_SELLER_ID", "SellerProfile", sellerId, { shopName: seller.shopName, idDocumentType: seller.idDocumentType });
  await notify(seller.userId, "ID_VERIFIED", "Identity verified", "Your ID has been verified. Thanks for confirming who you are.", "/studio/settings");
  revalidatePath("/admin/sellers");
  revalidatePath(`/admin/sellers/${sellerId}`);
  return { success: true };
}

/** Marks a fraud signal reviewed — doesn't undo anything on its own (an
 * admin who decides a flag is real acts through the existing tools: suspend
 * the seller, cancel the order, etc., then comes back here to close it out).
 * See lib/services/fraud.ts for how flags are generated. */
export async function resolveFraudFlagAction(flagId: string, resolution: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const resolutionResult = adminReasonSchema.safeParse(resolution);
  if (!resolutionResult.success) return { error: firstIssue(resolutionResult) };

  await prisma.fraudFlag.update({
    where: { id: flagId },
    data: { resolvedAt: new Date(), resolvedById: admin.id, resolution: resolutionResult.data },
  });
  await logAdminAction(admin.id, "RESOLVE_FRAUD_FLAG", "FraudFlag", flagId, { resolution: resolutionResult.data });
  revalidatePath("/admin/fraud-flags");
  return { success: true };
}

export async function suspendSellerAction(sellerId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const seller = await prisma.sellerProfile.update({ where: { id: sellerId }, data: { status: "SUSPENDED" } });
  await hideSuspendedSellerListings(sellerId);
  updateTag("closets");
  updateTag("yard-sales");
  await logAdminAction(admin.id, "SUSPEND_SELLER", "SellerProfile", sellerId, { shopName: seller.shopName });
  await revokeSessions(seller.userId);
  await notify(seller.userId, "ORDER_CONFIRMED", "Account suspended", `${seller.shopName} has been suspended pending review. Contact support.`, "/studio");
  revalidatePath("/admin/sellers");
  return { success: true };
}

/** Lifts a suspension pending manual review — a hold, not a permanent ban.
 * Does not touch warnings; clear individual warnings separately via
 * clearSellerWarningAction if the review found some no longer warranted. */
export async function reinstateSellerAction(sellerId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return { error: "Seller not found." };
  if (seller.status !== "SUSPENDED") return { error: "This account isn't suspended." };

  await prisma.sellerProfile.update({ where: { id: sellerId }, data: { status: "APPROVED" } });
  await restoreSellerListings(sellerId);
  updateTag("closets");
  updateTag("yard-sales");
  await logAdminAction(admin.id, "REINSTATE_SELLER", "SellerProfile", sellerId, { shopName: seller.shopName });
  await notify(seller.userId, "ACCOUNT_REINSTATED", "Account reinstated", `${seller.shopName} has been reinstated after review. Welcome back.`, "/studio");
  revalidatePath("/admin/sellers");
  revalidatePath(`/admin/sellers/${sellerId}`);
  return { success: true };
}

/**
 * Support-assisted version of closeStoreAction — for a seller who wants to
 * close their store but has asked support to do it for them (can't access
 * their account, or just prefers a person to confirm it). Same guardrails as
 * the self-serve path (no open orders/disputes); the only difference is who
 * clicks the button and that it's logged to the admin audit trail.
 */
export async function adminCloseSellerStoreAction(sellerId: string, reason?: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return { error: "Seller not found." };
  if (seller.status === "SUSPENDED") return { error: "A suspended account can't be closed this way. Reinstate it or handle it as a suspension." };
  if (seller.status === "CLOSED") return { error: "This store is already closed." };
  // A PENDING store was never approved; closing it would let a reopen
  // (which writes APPROVED) skip admin review.
  if (seller.status !== "APPROVED") return { error: "Only an approved store can be closed. Approve or reject a pending application instead." };

  if (reason && reason.trim()) {
    const reasonResult = adminReasonSchema.safeParse(reason);
    if (!reasonResult.success) return { error: firstIssue(reasonResult) };
    reason = reasonResult.data;
  }

  const blockers = await getStoreClosureBlockers(seller.id);
  if (blockers.length > 0) return { error: `Resolve these first: ${blockers.join(", ")}.` };

  await prisma.$transaction([
    prisma.sellerProfile.update({ where: { id: sellerId }, data: { status: "CLOSED", closedAt: new Date(), closeReason: reason?.trim() || null } }),
    prisma.product.updateMany({ where: { sellerId, status: "ACTIVE" }, data: { status: "ARCHIVED" } }),
  ]);
  await logAdminAction(admin.id, "CLOSE_SELLER_STORE", "SellerProfile", sellerId, { shopName: seller.shopName, reason });
  await notify(seller.userId, "STORE_CLOSED", "Your store is closed", `${seller.shopName} has been closed as requested. Contact support to reopen it any time.`, "/studio/settings");

  updateTag("products");
  revalidatePath("/admin/sellers");
  revalidatePath(`/admin/sellers/${sellerId}`);
  return { success: true };
}

/** Admin-side reopen — mirrors reopenStoreAction for a seller who asked support to do it for them. */
export async function adminReopenSellerStoreAction(sellerId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return { error: "Seller not found." };
  if (seller.status !== "CLOSED") return { error: "This store isn't closed." };

  await prisma.sellerProfile.update({ where: { id: sellerId }, data: { status: "APPROVED", closedAt: null, closeReason: null } });
  await logAdminAction(admin.id, "REOPEN_SELLER_STORE", "SellerProfile", sellerId, { shopName: seller.shopName });
  await notify(seller.userId, "STORE_REOPENED", "Your store is back open", `${seller.shopName} has been reopened. Reactivate any listings you'd like buyers to see.`, "/studio/products");

  revalidatePath("/admin/sellers");
  revalidatePath(`/admin/sellers/${sellerId}`);
  return { success: true };
}

/**
 * The admin prohibited-items enforcement action: immediately delists the
 * listing, logs a warning against the seller (full detail — reason, which
 * admin — stays admin-only via AdminAuditLog; the seller only ever sees their
 * warning count + the reason, never who issued it), and auto-suspends the
 * account once it reaches AUTO_SUSPEND_WARNING_COUNT active warnings.
 */
export async function flagProhibitedItemAction(productId: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (!reason.trim()) return { error: "A reason is required." };

  const product = await prisma.product.findUnique({ where: { id: productId }, include: { seller: true } });
  if (!product) return { error: "Product not found." };

  await prisma.product.update({ where: { id: productId }, data: { status: "REMOVED" } });

  const warning = await prisma.sellerWarning.create({
    data: {
      sellerId: product.sellerId,
      productId: product.id,
      productTitle: product.title,
      reason: reason.trim(),
      issuedByAdminId: admin.id,
    },
  });
  await logAdminAction(admin.id, "FLAG_PROHIBITED_ITEM", "Product", productId, {
    shopName: product.seller.shopName,
    productTitle: product.title,
    reason: reason.trim(),
  });

  await notify(
    product.seller.userId,
    "ACCOUNT_WARNING",
    "Listing removed for a policy violation",
    `"${product.title}" was removed for violating ATBP's prohibited items policy: ${reason.trim()}`,
    "/studio/settings"
  );

  const activeWarningCount = await prisma.sellerWarning.count({ where: { sellerId: product.sellerId, active: true } });
  if (activeWarningCount >= AUTO_SUSPEND_WARNING_COUNT && product.seller.status !== "SUSPENDED") {
    await prisma.sellerProfile.update({ where: { id: product.sellerId }, data: { status: "SUSPENDED" } });
    await hideSuspendedSellerListings(product.sellerId);
    updateTag("closets");
    updateTag("yard-sales");
    await logAdminAction(admin.id, "AUTO_SUSPEND_SELLER", "SellerProfile", product.sellerId, {
      shopName: product.seller.shopName,
      activeWarningCount,
      reason: "Reached 3 active prohibited-item warnings",
    });
    await revokeSessions(product.seller.userId);
    await notify(
      product.seller.userId,
      "ACCOUNT_WARNING",
      "Account suspended for repeated policy violations",
      `${product.seller.shopName} has reached ${activeWarningCount} active warnings and has been suspended pending review. Contact support.`,
      "/studio"
    );
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/sellers/${product.sellerId}`);
  revalidatePath("/admin/sellers");
  return { success: true, warningId: warning.id };
}

/**
 * A listing report queue's "Confirm as Violation" action — reuses
 * flagProhibitedItemAction rather than duplicating the delist/warn/auto-suspend
 * logic, then marks every open report on that product ACTIONED so the same
 * violation doesn't sit in the queue twice.
 */
export async function confirmListingViolationAction(productId: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const result = await flagProhibitedItemAction(productId, reason);
  if ("error" in result) return result;

  await prisma.report.updateMany({
    where: { productId, status: { in: ["OPEN", "REVIEWED"] } },
    data: { status: "ACTIONED", reviewedById: admin.id, resolvedAt: new Date() },
  });

  revalidatePath("/admin/reports");
  return { success: true };
}

/** Dismisses every open report on a product as "not a violation" — no effect
 * on the seller or listing, unlike confirmListingViolationAction. */
export async function dismissListingReportsAction(productId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  await prisma.report.updateMany({
    where: { productId, status: { in: ["OPEN", "REVIEWED"] } },
    data: { status: "DISMISSED", reviewedById: admin.id, resolvedAt: new Date() },
  });

  revalidatePath("/admin/reports");
  return { success: true };
}

/** Clears (deactivates) a single warning without deleting it — the row stays
 * for history, it just stops counting toward the auto-suspend threshold. */
export async function clearSellerWarningAction(warningId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const warning = await prisma.sellerWarning.findUnique({ where: { id: warningId } });
  if (!warning) return { error: "Warning not found." };

  await prisma.sellerWarning.update({ where: { id: warningId }, data: { active: false } });
  await logAdminAction(admin.id, "CLEAR_SELLER_WARNING", "SellerWarning", warningId, { sellerId: warning.sellerId, productTitle: warning.productTitle });

  revalidatePath(`/admin/sellers/${warning.sellerId}`);
  return { success: true };
}

/** Marks a seller-submitted "Other" category tag as reviewed. Approving here
 * is a triage decision, not automatic promotion — turning one into a real
 * Category (with its own icon/parent/slug) is a separate step an admin takes
 * in /admin/categories once they've decided it's worth adding. */
export async function reviewCategoryTagSuggestionAction(suggestionId: string, status: "APPROVED" | "REJECTED") {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const suggestion = await prisma.categoryTagSuggestion.update({ where: { id: suggestionId }, data: { status } });
  await logAdminAction(admin.id, "REVIEW_CATEGORY_TAG_SUGGESTION", "CategoryTagSuggestion", suggestionId, { tag: suggestion.tag, status });
  revalidatePath("/admin/category-suggestions");
  return { success: true };
}

/** The one-click version of "approve, then separately go create the matching
 * category" — previously two disconnected steps (approving here did nothing
 * but mark the suggestion promotable; the admin still had to remember to go
 * add it from Categories). Creates a real top-level Category in the same
 * action, same as createCategoryAction does. */
export async function approveAndCreateCategoryFromSuggestionAction(suggestionId: string, name: string, icon: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (!name.trim() || !icon.trim()) return { error: "Name and icon are required." };

  const suggestion = await prisma.categoryTagSuggestion.update({ where: { id: suggestionId }, data: { status: "APPROVED" } });
  const count = await prisma.category.count();
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  const category = await prisma.category.create({ data: { name: name.trim(), slug, icon: icon.trim(), order: count } });

  await logAdminAction(admin.id, "REVIEW_CATEGORY_TAG_SUGGESTION", "CategoryTagSuggestion", suggestionId, { tag: suggestion.tag, status: "APPROVED" });
  await logAdminAction(admin.id, "CREATE_CATEGORY", "Category", category.id, { name: category.name, slug, fromSuggestion: suggestion.tag });

  revalidatePath("/admin/category-suggestions");
  revalidatePath("/admin/categories");
  return { success: true, category };
}

/** "Staff picks" on Discover > Closets — a simple boolean flag, admin-toggled. */
export async function toggleClosetFeaturedAction(closetId: string, featured: boolean) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const closet = await prisma.closet.update({ where: { id: closetId }, data: { featured } });
  await logAdminAction(admin.id, "TOGGLE_CLOSET_FEATURED", "Closet", closetId, { featured });
  revalidatePath("/admin/closets");
  revalidatePath("/discover");
  updateTag("closets");
  return { success: true, closet };
}

export async function moderateProductAction(productId: string, status: "ACTIVE" | "FLAGGED" | "REMOVED") {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const product = await prisma.product.update({ where: { id: productId }, data: { status }, include: { seller: true } });
  await logAdminAction(admin.id, "MODERATE_PRODUCT", "Product", productId, { status });

  if (status === "ACTIVE") {
    await notify(product.seller.userId, "PRODUCT_APPROVED", "Your listing was approved", `"${product.title}" is live on ATBP again.`, `/product/${productId}`);
  } else if (status === "REMOVED") {
    await notify(product.seller.userId, "PRODUCT_REJECTED", "Your listing was rejected", `"${product.title}" was reviewed by ATBP and removed from the marketplace.`, "/studio/products");
  }

  revalidatePath("/admin/products");
  updateTag("products");
  return { success: true };
}

export async function moderateLivestreamAction(livestreamId: string, status: "LIVE" | "CANCELLED" | "ENDED") {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  await prisma.livestream.update({ where: { id: livestreamId }, data: { status } });
  await logAdminAction(admin.id, "MODERATE_LIVESTREAM", "Livestream", livestreamId, { status });
  revalidatePath("/admin/livestreams");
  return { success: true };
}

export async function resolveReportAction(reportId: string, status: "REVIEWED" | "RESOLVED" | "DISMISSED") {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const report = await prisma.report.update({ where: { id: reportId }, data: { status, resolvedAt: new Date() } });
  await logAdminAction(admin.id, "RESOLVE_REPORT", "Report", reportId, { status, targetLabel: report.targetLabel });

  const message =
    status === "RESOLVED"
      ? `Your report on "${report.targetLabel}" was reviewed and action was taken. Thanks for helping keep ATBP safe.`
      : status === "DISMISSED"
        ? `Your report on "${report.targetLabel}" was reviewed, and we didn't find a violation of our policies.`
        : `Your report on "${report.targetLabel}" is being reviewed by our team.`;
  await notify(report.reporterId, "REPORT_UPDATE", "Update on your report", message, "/notifications");

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function resolveSupportTicketAction(ticketId: string, status: "IN_PROGRESS" | "RESOLVED") {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null },
  });
  await logAdminAction(admin.id, "RESOLVE_SUPPORT_TICKET", "SupportTicket", ticketId, { status });

  if (ticket.userId) {
    const message =
      status === "RESOLVED"
        ? `Your support request about "${ticket.topic.toLowerCase()}" has been resolved. Reply here if you still need help.`
        : `Our team is now looking into your support request about "${ticket.topic.toLowerCase()}".`;
    await notify(ticket.userId, "REPORT_UPDATE", "Update on your support request", message, "/help");
  }

  revalidatePath("/admin/support");
  return { success: true };
}

export async function resolveDisputeAction(
  disputeId: string,
  status: "UNDER_REVIEW" | "RESOLVED_REFUND" | "RESOLVED_DENIED" | "CLOSED"
) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  // UNDER_REVIEW is a non-terminal "I'm looking into this" marker — unlike
  // the other three statuses, it must not set resolvedAt or touch the
  // order's own status, since nothing has actually been decided yet.
  const isTerminal = status !== "UNDER_REVIEW";

  const dispute = await prisma.dispute.update({
    where: { id: disputeId },
    data: { status, ...(isTerminal ? { resolvedAt: new Date() } : {}) },
    include: { order: { include: { items: true } } },
  });
  await logAdminAction(admin.id, status === "UNDER_REVIEW" ? "REVIEW_DISPUTE" : "RESOLVE_DISPUTE", "Dispute", disputeId, { status, orderNumber: dispute.order.orderNumber });

  // A guest dispute has no raisedById to notify in-app — email their order's
  // guestEmail instead, same "reachable without an account" principle as the
  // guest tracking link itself.
  async function tellDisputant(title: string, body: string) {
    if (dispute.raisedById) {
      await notify(dispute.raisedById, "ORDER_CONFIRMED", title, body, `/orders/${dispute.orderId}`);
    } else if (dispute.order.guestEmail) {
      await sendEmail(dispute.order.guestEmail, title, body);
    }
  }

  if (status === "RESOLVED_REFUND") {
    // submitDisputeAction doesn't block disputing an order the buyer already
    // cancelled themselves — if that's what happened, cancelOrderAction
    // already released inventory, decremented totalSales, and reversed any
    // promo/coupon for this order, so doing it all again here would
    // double-restock and double-reverse. Only unwind once.
    const alreadyCancelled = dispute.order.status === "CANCELLED";
    // A disputed order can already be DELIVERED/COMPLETED (deliveredAt set,
    // seller's totalSales already counted) by the time it's refunded — unlike
    // a buyer's own pre-fulfillment cancelOrderAction, this has to unwind
    // that: clear deliveredAt (also what the Closet/casual-listing monthly
    // sales cap counts by) and decrement totalSales, or a refunded order
    // keeps permanently counting as a real sale.
    const wasCompleted = !!dispute.order.deliveredAt;
    await prisma.order.update({
      where: { id: dispute.orderId },
      data: { status: "CANCELLED", paymentStatus: "REFUNDED", deliveredAt: null },
    });
    if (!alreadyCancelled) {
      if (wasCompleted) {
        await prisma.sellerProfile.update({ where: { id: dispute.order.sellerId }, data: { totalSales: { decrement: 1 } } });
      }
      // Digital products' download tokens are issued the instant the order is
      // created (same reasoning as cancelOrderAction) — nothing to release.
      if (dispute.order.fulfillmentMethod !== "DIGITAL_PRODUCT") {
        for (const item of dispute.order.items) {
          await releaseInventory(item.productId, item.quantity);
        }
      }
      await reversePromoRedemption(dispute.orderId);
      await reverseCouponRedemption(dispute.orderId);
    }
    await tellDisputant("Refund approved", `Your dispute for order ${dispute.order.orderNumber} was resolved with a refund.`);
  } else if (status === "UNDER_REVIEW") {
    await tellDisputant("Your dispute is under review", `We're actively looking into your dispute for order ${dispute.order.orderNumber}, and we'll follow up with a decision soon.`);
  } else {
    await prisma.order.update({ where: { id: dispute.orderId }, data: { status: "COMPLETED" } });
    await tellDisputant("Dispute update", `Your dispute for order ${dispute.order.orderNumber} has been reviewed.`);
  }

  revalidatePath("/admin/disputes");
  return { success: true };
}

export async function toggleSellerBadgeAction(sellerId: string, badge: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return { error: "Seller not found." };

  const current = seller.badges as string[];
  const next = current.includes(badge) ? current.filter((b) => b !== badge) : [...current, badge];
  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: { badges: next, verified: next.length > 0 || seller.verified },
  });
  await logAdminAction(admin.id, current.includes(badge) ? "REMOVE_SELLER_BADGE" : "ADD_SELLER_BADGE", "SellerProfile", sellerId, { badge });
  if (!current.includes(badge)) {
    await notify(seller.userId, "ORDER_CONFIRMED", "New badge earned!", `${seller.shopName} was awarded a new verification badge.`, "/studio/shop");
  }
  revalidatePath("/admin/verification");
  revalidatePath("/admin/sellers");
  return { success: true };
}

export async function suspendUserAction(userId: string, suspend: boolean) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return { error: "User not found." };
  if (suspend && target.role === "ADMIN") return { error: "Admin accounts can't be suspended from here." };

  // Reinstating used to always reset role to BUYER, silently demoting a
  // suspended Seller — restore SELLER instead when they actually have a
  // SellerProfile, rather than trusting whatever role was cached before
  // suspension (which could itself be stale).
  const nextRole = suspend
    ? "SUSPENDED"
    : (await prisma.sellerProfile.findUnique({ where: { userId }, select: { id: true } })) ? "SELLER" : "BUYER";

  await prisma.user.update({ where: { id: userId }, data: { role: nextRole } });
  await logAdminAction(admin.id, suspend ? "SUSPEND_USER" : "REINSTATE_USER", "User", userId, { restoredRole: suspend ? undefined : nextRole });
  await revokeSessions(userId);
  revalidatePath("/admin/users");
  return { success: true };
}

/** Admin-initiated account deletion (anonymization). Irreversible: strips the
 * person's data and locks the account, keeping order/review/dispute rows that
 * other people's records depend on. Refuses admins, the caller's own account,
 * and anything with open orders, disputes, bids or a shop balance. */
export async function adminDeleteUserAction(userId: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (userId === admin.id) return { error: "You can't delete your own account from here." };
  const parsed = adminReasonSchema.safeParse(reason);
  if (!parsed.success) return { error: firstIssue(parsed) };

  const blockers = await getAccountDeletionBlockers(userId);
  if (blockers.length > 0) return { error: `Can't delete yet: ${blockers.join("; ")}.` };

  const result = await anonymizeAccount(userId);
  if ("error" in result) return result;
  await logAdminAction(admin.id, "DELETE_USER", "User", userId, { reason: parsed.data });
  revalidatePath("/admin/users");
  revalidatePath("/admin/sellers");
  updateTag("products");
  return { success: true };
}

export async function createMarketAction(input: { name: string; city: string; tagline?: string; imageUrl: string; schedule?: string }) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const count = await prisma.market.count();
  const market = await prisma.market.create({ data: { ...input, order: count } });
  await logAdminAction(admin.id, "CREATE_MARKET", "Market", market.id, { name: input.name });
  revalidatePath("/admin/markets");
  revalidatePath("/markets");
  updateTag("markets");
  return { success: true };
}

export async function toggleMarketActiveAction(marketId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market) return { error: "Market not found." };
  await prisma.market.update({ where: { id: marketId }, data: { active: !market.active } });
  await logAdminAction(admin.id, "TOGGLE_MARKET_ACTIVE", "Market", marketId, { active: !market.active });
  revalidatePath("/admin/markets");
  revalidatePath("/markets");
  updateTag("markets");
  return { success: true };
}

export async function deleteMarketAction(marketId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  await prisma.market.delete({ where: { id: marketId } });
  await logAdminAction(admin.id, "DELETE_MARKET", "Market", marketId);
  revalidatePath("/admin/markets");
  revalidatePath("/markets");
  updateTag("markets");
  return { success: true };
}

export async function createCollectionAction(input: { slug: string; title: string; subtitle?: string; emoji?: string; type: "PICK" | "SEASONAL" | "SHOPS" }) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const existing = await prisma.collection.findUnique({ where: { slug: input.slug } });
  if (existing) return { error: "A collection with that slug already exists." };
  const count = await prisma.collection.count();
  const collection = await prisma.collection.create({ data: { ...input, order: count } });
  await logAdminAction(admin.id, "CREATE_COLLECTION", "Collection", collection.id, { slug: input.slug });
  revalidatePath("/admin/collections");
  revalidatePath("/discover");
  revalidatePath("/picks");
  updateTag("collections");
  return { success: true };
}

export async function toggleCollectionActiveAction(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection) return { error: "Collection not found." };
  await prisma.collection.update({ where: { id }, data: { active: !collection.active } });
  await logAdminAction(admin.id, "TOGGLE_COLLECTION_ACTIVE", "Collection", id, { active: !collection.active });
  revalidatePath("/admin/collections");
  revalidatePath("/discover");
  revalidatePath("/picks");
  updateTag("collections");
  return { success: true };
}

export async function deleteCollectionAction(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  await prisma.collection.delete({ where: { id } });
  await logAdminAction(admin.id, "DELETE_COLLECTION", "Collection", id);
  revalidatePath("/admin/collections");
  revalidatePath("/discover");
  revalidatePath("/picks");
  updateTag("collections");
  return { success: true };
}

export async function addProductToCollectionAction(collectionId: string, titleQuery: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const matches = await prisma.product.findMany({ where: { title: { contains: titleQuery, mode: "insensitive" } }, take: 6 });
  if (matches.length === 0) return { error: "No product matched that title." };
  if (matches.length > 1) return { error: `${matches.length} products matched. Be more specific: ${matches.map((m) => m.title).join(", ")}` };
  const count = await prisma.collectionProduct.count({ where: { collectionId } });
  await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId, productId: matches[0].id } },
    update: {},
    create: { collectionId, productId: matches[0].id, order: count },
  });
  await logAdminAction(admin.id, "ADD_PRODUCT_TO_COLLECTION", "Collection", collectionId, { productId: matches[0].id, title: matches[0].title });
  revalidatePath("/admin/collections");
  revalidatePath("/discover");
  revalidatePath("/picks");
  updateTag("collections");
  return { success: true };
}

export async function removeProductFromCollectionAction(collectionProductId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  await prisma.collectionProduct.delete({ where: { id: collectionProductId } });
  await logAdminAction(admin.id, "REMOVE_PRODUCT_FROM_COLLECTION", "CollectionProduct", collectionProductId);
  revalidatePath("/admin/collections");
  revalidatePath("/discover");
  revalidatePath("/picks");
  updateTag("collections");
  return { success: true };
}

export async function addSellerToCollectionAction(collectionId: string, handle: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const seller = await prisma.sellerProfile.findUnique({ where: { handle: handle.trim().replace(/^@/, "") } });
  if (!seller) return { error: "No seller with that handle." };
  const count = await prisma.collectionSeller.count({ where: { collectionId } });
  await prisma.collectionSeller.upsert({
    where: { collectionId_sellerId: { collectionId, sellerId: seller.id } },
    update: {},
    create: { collectionId, sellerId: seller.id, order: count },
  });
  await logAdminAction(admin.id, "ADD_SELLER_TO_COLLECTION", "Collection", collectionId, { sellerId: seller.id, handle: seller.handle });
  revalidatePath("/admin/collections");
  revalidatePath("/discover");
  revalidatePath("/picks");
  updateTag("collections");
  return { success: true };
}

export async function removeSellerFromCollectionAction(collectionSellerId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  await prisma.collectionSeller.delete({ where: { id: collectionSellerId } });
  await logAdminAction(admin.id, "REMOVE_SELLER_FROM_COLLECTION", "CollectionSeller", collectionSellerId);
  revalidatePath("/admin/collections");
  revalidatePath("/discover");
  revalidatePath("/picks");
  updateTag("collections");
  return { success: true };
}

export async function cancelDropAction(dropId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  await prisma.drop.update({ where: { id: dropId }, data: { status: "ENDED" } });
  await logAdminAction(admin.id, "CANCEL_DROP", "Drop", dropId);
  revalidatePath("/admin/drops");
  revalidatePath("/drops");
  updateTag("drops");
  return { success: true };
}

export async function createCategoryAction(name: string, slug: string, icon: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const count = await prisma.category.count();
  const category = await prisma.category.create({ data: { name, slug, icon, order: count } });
  await logAdminAction(admin.id, "CREATE_CATEGORY", "Category", category.id, { name, slug });
  revalidatePath("/admin/categories");
  return { success: true };
}

export async function deleteCategoryAction(categoryId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const productsUsing = await prisma.product.count({ where: { categoryId } });
  if (productsUsing > 0) return { error: "Category still has products assigned to it." };
  await prisma.category.delete({ where: { id: categoryId } });
  await logAdminAction(admin.id, "DELETE_CATEGORY", "Category", categoryId);
  revalidatePath("/admin/categories");
  return { success: true };
}

/** Renames a category and/or changes its icon and parent — the rename/re-icon
 * and nesting capability the Categories page previously didn't have (its own
 * copy said to edit parentId directly in the database "for now"). Slug is
 * left alone deliberately: it's baked into existing category-filter links
 * (/discover?category=slug) across the site, so changing it would silently
 * break those; rename the display name instead. Pass parentId `null` to
 * promote a category back to top-level, or omit it to leave parent unchanged. */
export async function updateCategoryAction(categoryId: string, data: { name?: string; icon?: string; parentId?: string | null }) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (data.parentId === categoryId) return { error: "A category can't be its own parent." };
  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
    if (!parent) return { error: "Parent category not found." };
    if (parent.parentId) return { error: "Categories can only nest one level deep. Pick a top-level category as the parent." };
    const childCount = await prisma.category.count({ where: { parentId: categoryId } });
    if (childCount > 0) return { error: "This category has its own children, and a category with children can't also be nested under another." };
  }
  const category = await prisma.category.update({ where: { id: categoryId }, data });
  await logAdminAction(admin.id, "UPDATE_CATEGORY", "Category", categoryId, data);
  revalidatePath("/admin/categories");
  revalidatePath("/discover");
  return { success: true, category };
}

/**
 * Direct listing edit — previously the only admin lever on a product was the
 * status toggle (Active/Flagged/Removed), so a wrong price or a misleading
 * title meant Remove-and-ask-the-seller-to-relist or just leaving it wrong.
 * Deliberately scoped to title/description/price only — not images,
 * category, or inventory, which carry more risk of admin error and are
 * lower-frequency fixes. The seller is notified so an edit is never silent.
 */
export async function adminUpdateProductAction(productId: string, data: { title?: string; description?: string; price?: number }, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (!reason.trim()) return { error: "A reason is required." };
  if (data.title !== undefined && !data.title.trim()) return { error: "Title can't be empty." };
  if (data.description !== undefined && !data.description.trim()) return { error: "Description can't be empty." };
  if (data.price !== undefined && data.price <= 0) return { error: "Price must be positive." };

  const reasonResult = adminReasonSchema.safeParse(reason);
  if (!reasonResult.success) return { error: firstIssue(reasonResult) };
  reason = reasonResult.data;
  if (data.title !== undefined) {
    const r = productTitleSchema.safeParse(data.title);
    if (!r.success) return { error: firstIssue(r) };
    data.title = r.data;
  }
  if (data.description !== undefined) {
    const r = productDescriptionSchema.safeParse(data.description);
    if (!r.success) return { error: firstIssue(r) };
    data.description = r.data;
  }
  if (data.price !== undefined) {
    const r = productMoneySchema.safeParse(data.price);
    if (!r.success) return { error: firstIssue(r) };
    data.price = r.data;
  }

  const before = await prisma.product.findUnique({ where: { id: productId }, include: { seller: true } });
  if (!before) return { error: "Product not found." };

  const product = await prisma.product.update({ where: { id: productId }, data });
  await logAdminAction(admin.id, "ADMIN_UPDATE_PRODUCT", "Product", productId, { reason, changed: Object.keys(data), before: { title: before.title, description: before.description, price: before.price } });
  await notify(before.seller.userId, "ACCOUNT_WARNING", "A listing was edited by ATBP", `"${product.title}" was edited by an ATBP admin: ${reason}`, `/product/${productId}`);

  revalidatePath("/admin/products");
  revalidatePath(`/product/${productId}`);
  updateTag("products");
  return { success: true };
}

// ---------- Founding Seller manual override ----------
// The program is normally fully automatic (maybeGrantFoundingSeller, fired
// from seller approval and BIR verification). These two exist for the
// genuine edge cases that leaves uncovered: a slot that should have been
// granted but wasn't because of approval/verification ordering, or one that
// needs revoking for cause — see the Admin Handbook's flagged gap.

export async function adminGrantFoundingSellerAction(sellerId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return { error: "Seller not found." };
  if (seller.foundingSeller) return { error: "This seller already has Founding Seller status." };

  const availability = await getFoundingSellerAvailability();
  if (availability.full) return { error: "All 200 Founding Seller slots are claimed. None are left to grant." };

  const granted = await grantFoundingSeller(sellerId);
  if (!granted) return { error: "No slots remaining (claimed by someone else just now)." };

  await logAdminAction(admin.id, "ADMIN_GRANT_FOUNDING_SELLER", "SellerProfile", sellerId, { shopName: seller.shopName, foundingSellerNumber: granted.foundingSellerNumber });
  await notify(seller.userId, "ORDER_CONFIRMED", "You're Founding Seller #" + granted.foundingSellerNumber + "!", `${seller.shopName} is one of ATBP's first 200 sellers: 8% commission and free Pro for 1 year, no strings attached.`, "/studio");

  revalidatePath("/admin/founding-sellers");
  revalidatePath(`/admin/sellers/${sellerId}`);
  return { success: true };
}

export async function adminRevokeFoundingSellerAction(sellerId: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (!reason.trim()) return { error: "A reason is required." };
  const reasonResult = adminReasonSchema.safeParse(reason);
  if (!reasonResult.success) return { error: firstIssue(reasonResult) };
  reason = reasonResult.data;
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return { error: "Seller not found." };
  if (!seller.foundingSeller) return { error: "This seller doesn't have Founding Seller status." };

  await revokeFoundingSeller(sellerId);
  await logAdminAction(admin.id, "ADMIN_REVOKE_FOUNDING_SELLER", "SellerProfile", sellerId, { shopName: seller.shopName, reason, formerNumber: seller.foundingSellerNumber });
  await notify(seller.userId, "ACCOUNT_WARNING", "Founding Seller status removed", `Your Founding Seller status on ${seller.shopName} has been removed. Contact support if you have questions.`, "/studio");

  revalidatePath("/admin/founding-sellers");
  revalidatePath(`/admin/sellers/${sellerId}`);
  return { success: true };
}

/**
 * Cancels a live or scheduled auction — the admin lever that never existed
 * even before AUCTIONS_ENABLED was switched off (see the Admin Handbook's
 * flagged gap: "no /admin/auctions route at all"). Refunds nothing itself
 * since bidding doesn't hold funds until an auction is won — cancelling
 * before that point has no payment to unwind, just bidders to notify.
 */
export async function adminCancelAuctionAction(auctionId: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (!reason.trim()) return { error: "A reason is required." };

  const auction = await prisma.productAuction.findUnique({
    where: { id: auctionId },
    include: { product: { include: { seller: true } }, bids: { distinct: ["userId"], select: { userId: true } } },
  });
  if (!auction) return { error: "Auction not found." };
  if (auction.status !== "ACTIVE") return { error: "Only an active auction can be cancelled." };

  await prisma.productAuction.update({ where: { id: auctionId }, data: { status: "CANCELLED" } });
  await logAdminAction(admin.id, "ADMIN_CANCEL_AUCTION", "ProductAuction", auctionId, { reason, productTitle: auction.product.title, bidCount: auction.bidCount });

  await notify(auction.product.seller.userId, "AUCTION_ENDED", "Auction cancelled by ATBP", `"${auction.product.title}": ${reason}`, "/studio/auctions");
  for (const bidder of auction.bids) {
    await notify(bidder.userId, "AUCTION_ENDED", "An auction you bid on was cancelled", `"${auction.product.title}" was cancelled by ATBP: ${reason}`, "/bids");
  }

  revalidatePath("/admin/auctions");
  return { success: true };
}

// ---------- Order status intervention ----------
// Orders were previously read-only in /admin — every unstick-a-stuck-order
// request had nowhere to go except a Dispute, even when nothing about money
// or a refund was actually in question (e.g. a seller shipped an item but
// never clicked "mark shipped"). This reuses the same updateOrderStatus
// service function sellers/the system use, so status-linked side effects
// (buyer notifications, deliveredAt bookkeeping, the Closet monthly-cap
// sync) all still fire correctly — it does not touch payment, commission, or
// refund state. Anything involving money still goes through Disputes.
const ADMIN_ORDER_STATUSES = new Set(["PAYMENT_PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED", "CANCELLED"]);

export async function adminUpdateOrderStatusAction(orderId: string, status: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (!ADMIN_ORDER_STATUSES.has(status)) return { error: "Not a valid order status." };
  if (!reason.trim()) return { error: "A reason is required. This is logged to the audit trail." };
  const reasonResult = adminReasonSchema.safeParse(reason);
  if (!reasonResult.success) return { error: firstIssue(reasonResult) };
  reason = reasonResult.data;

  const existing = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, orderNumber: true } });
  if (!existing) return { error: "Order not found." };
  if (existing.status === "DISPUTED") return { error: "This order has an open dispute. Resolve it from /admin/disputes instead of changing status directly." };

  await updateOrderStatus(orderId, status);
  await logAdminAction(admin.id, "UPDATE_ORDER_STATUS", "Order", orderId, { from: existing.status, to: status, reason, orderNumber: existing.orderNumber });

  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}

/**
 * Platform-wide (or role-targeted) announcement — every other notification
 * in the app is triggered by a specific business event; this is the one
 * deliberately-manual exception. Uses createMany for the notification rows
 * (one query, not N) since the audience can be every user on the platform;
 * push delivery stays fire-and-forget per user, same as notify() already
 * does, so a large audience never makes this action itself slow.
 */
export async function broadcastNotificationAction(target: "ALL" | "BUYERS" | "SELLERS", title: string, body: string, linkUrl?: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const broadcastResult = broadcastInputSchema.safeParse({ title, body });
  if (!broadcastResult.success) return { error: firstIssue(broadcastResult) };
  ({ title, body } = broadcastResult.data);

  const where = target === "BUYERS" ? { role: "BUYER" } : target === "SELLERS" ? { role: "SELLER" } : {};
  const users = await prisma.user.findMany({ where, select: { id: true } });
  if (users.length === 0) return { error: "No matching users to notify." };

  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type: "PLATFORM_ANNOUNCEMENT", title, body, linkUrl: linkUrl || null })),
  });
  for (const u of users) sendPushToUser(u.id, { title, body, url: linkUrl }).catch(() => {});

  await logAdminAction(admin.id, "BROADCAST_NOTIFICATION", "User", "broadcast", { target, title, recipientCount: users.length });
  return { success: true, recipientCount: users.length };
}

// ---------- Service order & digital download intervention ----------
// Neither had any admin lever at all before this — a stuck ServiceOrder (a
// seller gone unresponsive mid-project) or a compromised download link had
// no path except waiting for the automatic sweeps to eventually do something
// generic, or a developer stepping in directly.

const SERVICE_ORDER_STATUSES = new Set(["AWAITING_BRIEF", "IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED", "COMPLETED"]);

export async function adminUpdateServiceOrderStatusAction(serviceOrderId: string, status: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (!SERVICE_ORDER_STATUSES.has(status)) return { error: "Not a valid service order status." };
  if (!reason.trim()) return { error: "A reason is required. This is logged to the audit trail." };

  const serviceOrder = await prisma.serviceOrder.findUnique({ where: { id: serviceOrderId }, include: { order: { include: { seller: true } } } });
  if (!serviceOrder) return { error: "Service order not found." };

  await prisma.serviceOrder.update({ where: { id: serviceOrderId }, data: { status } });
  // COMPLETED is the only ServiceOrder status that should also move the
  // parent Order — matches what autoConfirmOverdueServiceOrders already does
  // for the automatic path, so a manual force-complete has the identical
  // effect (releases funds for payout) as the sweep would have.
  if (status === "COMPLETED") {
    await updateOrderStatus(serviceOrder.orderId, "COMPLETED");
  }
  await logAdminAction(admin.id, "ADMIN_UPDATE_SERVICE_ORDER", "ServiceOrder", serviceOrderId, { from: serviceOrder.status, to: status, reason, orderNumber: serviceOrder.order.orderNumber });

  const notifyTitle = status === "COMPLETED" ? "Order marked complete by ATBP" : "Your service order was updated by ATBP";
  await notify(serviceOrder.order.seller.userId, "PAYMENT_RECEIVED", notifyTitle, `${serviceOrder.order.orderNumber}: ${reason}`, "/studio/orders");
  if (serviceOrder.order.buyerId) {
    await notify(serviceOrder.order.buyerId, "ORDER_CONFIRMED", notifyTitle, `${serviceOrder.order.orderNumber}: ${reason}`, `/orders/${serviceOrder.orderId}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${serviceOrder.orderId}`);
  return { success: true };
}

export async function adminRevokeDigitalDownloadTokenAction(tokenId: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (!reason.trim()) return { error: "A reason is required." };
  const reasonResult = adminReasonSchema.safeParse(reason);
  if (!reasonResult.success) return { error: firstIssue(reasonResult) };
  reason = reasonResult.data;

  const token = await prisma.digitalDownloadToken.update({ where: { id: tokenId }, data: { revoked: true }, include: { orderItem: { include: { order: true } } } });
  await logAdminAction(admin.id, "ADMIN_REVOKE_DOWNLOAD_TOKEN", "DigitalDownloadToken", tokenId, { reason, orderNumber: token.orderItem.order.orderNumber, productTitle: token.orderItem.title });

  revalidatePath("/admin/orders");
  return { success: true };
}

export async function adminUnrevokeDigitalDownloadTokenAction(tokenId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const token = await prisma.digitalDownloadToken.update({ where: { id: tokenId }, data: { revoked: false }, include: { orderItem: { include: { order: true } } } });
  await logAdminAction(admin.id, "ADMIN_UNREVOKE_DOWNLOAD_TOKEN", "DigitalDownloadToken", tokenId, { orderNumber: token.orderItem.order.orderNumber });
  revalidatePath("/admin/orders");
  return { success: true };
}

// ---------- Review moderation ----------
// Hiding (not deleting) is the default path — it keeps a record of what was
// hidden and why, which a hard delete throws away. Use deleteReviewAction
// only for something with no legitimate reason to retain (spam, abuse).
// Both paths recompute the seller's rating/ratingCount immediately — see
// recomputeSellerRating in lib/services/reviews.ts — so a moderated review
// never keeps inflating or deflating a seller's displayed score.

export async function hideReviewAction(reviewId: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (!reason.trim()) return { error: "A reason is required." };
  const reasonResult = adminReasonSchema.safeParse(reason);
  if (!reasonResult.success) return { error: firstIssue(reasonResult) };
  reason = reasonResult.data;

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { hidden: true, hiddenReason: reason, hiddenAt: new Date(), hiddenById: admin.id },
  });
  await recomputeSellerRating(review.sellerId);
  await logAdminAction(admin.id, "HIDE_REVIEW", "Review", reviewId, { reason, sellerId: review.sellerId });

  revalidatePath("/admin/reviews");
  revalidatePath(`/seller/${review.sellerId}`);
  if (review.productId) revalidatePath(`/product/${review.productId}`);
  return { success: true };
}

export async function unhideReviewAction(reviewId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { hidden: false, hiddenReason: null, hiddenAt: null, hiddenById: null },
  });
  await recomputeSellerRating(review.sellerId);
  await logAdminAction(admin.id, "UNHIDE_REVIEW", "Review", reviewId, { sellerId: review.sellerId });

  revalidatePath("/admin/reviews");
  revalidatePath(`/seller/${review.sellerId}`);
  if (review.productId) revalidatePath(`/product/${review.productId}`);
  return { success: true };
}

/** Hard delete — for spam/abuse with nothing worth retaining. Prefer
 * hideReviewAction for anything a seller might legitimately dispute later. */
export async function deleteReviewAction(reviewId: string, reason: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (!reason.trim()) return { error: "A reason is required." };
  const reasonResult = adminReasonSchema.safeParse(reason);
  if (!reasonResult.success) return { error: firstIssue(reasonResult) };
  reason = reasonResult.data;

  const review = await prisma.review.delete({ where: { id: reviewId } });
  await recomputeSellerRating(review.sellerId);
  await logAdminAction(admin.id, "DELETE_REVIEW", "Review", reviewId, { reason, sellerId: review.sellerId, rating: review.rating });

  revalidatePath("/admin/reviews");
  revalidatePath(`/seller/${review.sellerId}`);
  if (review.productId) revalidatePath(`/product/${review.productId}`);
  return { success: true };
}
