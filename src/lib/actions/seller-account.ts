"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { deleteDocumentBlob } from "@/lib/services/document-retention";
import { getStoreClosureBlockers } from "@/lib/services/store-closure";
import { sellerIdVerificationInputSchema, businessLicenseInputSchema, firstIssue } from "@/lib/validation";

async function requireSeller() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
}

/**
 * Voluntary store closure — distinct from admin Suspend, which is for-cause
 * and punitive. Closing archives every ACTIVE listing so nothing lingers in
 * Explore/Search (rather than relying on every discovery query to also
 * check seller status, which they don't all do consistently today), and
 * blocks if any order or dispute is still open so a buyer is never stranded
 * mid-transaction. The seller's account, order history, and earned balance
 * are untouched — see reopenStoreAction to come back, and Studio > Payouts
 * to withdraw remaining funds either way.
 *
 * Not to be confused with `SellerProfile.temporarilyClosed`, which just
 * marks a shop as not open for business right now (vacation, off hours) —
 * that shop is still APPROVED and still sells online; this one is not.
 */
export async function closeStoreAction(reason?: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  if (seller.status === "SUSPENDED") return { error: "A suspended account can't be voluntarily closed. Contact support." };
  if (seller.status === "CLOSED") return { error: "Your store is already closed." };
  // Only an approved store can be closed. A PENDING one could otherwise close
  // and immediately reopen itself, and reopenStoreAction writes APPROVED,
  // which would skip admin approval entirely.
  if (seller.status !== "APPROVED") return { error: "Your store can be closed once it has been approved." };

  const blockers = await getStoreClosureBlockers(seller.id);
  if (blockers.length > 0) {
    return { error: `Resolve these first: ${blockers.join(", ")}.` };
  }

  await prisma.$transaction([
    prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { status: "CLOSED", closedAt: new Date(), closeReason: reason?.trim() || null },
    }),
    prisma.product.updateMany({ where: { sellerId: seller.id, status: "ACTIVE" }, data: { status: "ARCHIVED" } }),
  ]);

  await notify(seller.userId, "STORE_CLOSED", "Your store is closed", `${seller.shopName} is now closed and its listings are archived. You can reopen any time from Studio settings.`, "/studio/settings");

  updateTag("products");
  revalidatePath("/studio/settings");
  revalidatePath(`/seller/${seller.handle}`);
  return { success: true };
}

/** Reopens a voluntarily-closed store. Listings stay archived — the seller
 * reactivates them individually, since silently relisting everything after
 * a closure (possibly a long one) could surface stale prices/stock. */
export async function reopenStoreAction() {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  if (seller.status !== "CLOSED") return { error: "Your store isn't closed." };

  await prisma.sellerProfile.update({ where: { id: seller.id }, data: { status: "APPROVED", closedAt: null, closeReason: null } });
  await notify(seller.userId, "STORE_REOPENED", "Your store is back open", `${seller.shopName} is open again. Reactivate any listings you'd like buyers to see.`, "/studio/products");

  revalidatePath("/studio/settings");
  revalidatePath(`/seller/${seller.handle}`);
  return { success: true };
}

/** Re-upload an ID (and, for business sellers still unverified, the business
 * license) after an admin rejection — see idVerificationBlockMessage in
 * lib/constants.ts for how a rejected/unverified ID pauses new listings
 * until this is resolved. Clears idRejectedReason and resets the review
 * clock (idSubmittedAt), same as a first-time submission. */
export async function resubmitIdDocumentAction(input: { idDocumentType: string; idDocumentUrl: string; selfiePhotoUrl: string; businessLicenseUrl?: string }) {
  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  if (seller.idVerified) return { error: "Your ID is already verified." };

  const idResult = sellerIdVerificationInputSchema.safeParse({ idDocumentType: input.idDocumentType, idDocumentUrl: input.idDocumentUrl, selfiePhotoUrl: input.selfiePhotoUrl });
  if (!idResult.success) return { error: firstIssue(idResult) };

  let businessLicenseUrl: string | undefined;
  if (seller.sellerKind === "BUSINESS" && !seller.birVerified) {
    const licenseResult = businessLicenseInputSchema.safeParse(input.businessLicenseUrl);
    if (!licenseResult.success) return { error: firstIssue(licenseResult) };
    businessLicenseUrl = licenseResult.data;
  }

  // Delete the superseded file(s) after the DB write succeeds — never before,
  // so a failed update can't leave the profile pointing at a deleted blob.
  const previousIdUrl = seller.idDocumentUrl;
  const previousSelfieUrl = seller.selfiePhotoUrl;
  const previousLicenseUrl = businessLicenseUrl ? seller.businessLicenseUrl : null;

  await prisma.sellerProfile.update({
    where: { id: seller.id },
    data: {
      idDocumentType: idResult.data.idDocumentType,
      idDocumentUrl: idResult.data.idDocumentUrl,
      selfiePhotoUrl: idResult.data.selfiePhotoUrl,
      idSubmittedAt: new Date(),
      idRejectedReason: null,
      ...(businessLicenseUrl ? { businessLicenseUrl } : {}),
    },
  });
  await deleteDocumentBlob(previousIdUrl);
  await deleteDocumentBlob(previousSelfieUrl);
  await deleteDocumentBlob(previousLicenseUrl);

  revalidatePath("/studio/settings");
  return { success: true };
}
