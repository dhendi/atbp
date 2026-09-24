import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { isBlobUrlUnder, ID_DOCUMENT_BLOB_PREFIX } from "@/lib/safe-url";

/** Best-effort delete of a seller ID/license document blob — used both when
 * a seller resubmits (the old, now-superseded file would otherwise sit in
 * storage forever) and by the retention purge below. Never throws: a delete
 * failure shouldn't block a resubmit or corrupt the purge loop, and an
 * already-gone blob is not an error worth surfacing. */
export async function deleteDocumentBlob(url: string | null | undefined) {
  if (!url) return;
  // Only ever delete something that was uploaded as an ID document. These
  // URLs came from a client-submitted field, so without this a seller could
  // point the field at any blob (e.g. another shop's product photo) and have
  // it deleted on resubmit. Older documents uploaded before the prefix
  // existed are simply left in place.
  if (!isBlobUrlUnder(url, ID_DOCUMENT_BLOB_PREFIX)) return;
  try {
    await del(url);
  } catch {
    // Already deleted, or a transient storage error — not worth failing the caller over.
  }
}

// How long a verified ID stays as a raw file after approval. Once verified,
// the admin decision (idVerified/idVerifiedAt/idDocumentType) is the durable
// record; the scan itself is the kind of PII that shouldn't be kept
// indefinitely "just in case." A future dispute can ask the seller to
// re-upload — see resubmitIdDocumentAction.
const ID_RETENTION_DAYS = 90;

/** Lazy, on-view cleanup — same pattern as expireOverdueYardSales and
 * flagHighRiskSellers, since this app has no cron. Deletes the raw ID scan
 * for any seller verified more than ID_RETENTION_DAYS ago, keeping the
 * verification record itself (idVerified/idVerifiedAt/idDocumentType) intact
 * so admin history and dispute context aren't lost, only the raw file. */
export async function purgeExpiredIdDocuments() {
  const cutoff = new Date(Date.now() - ID_RETENTION_DAYS * 24 * 60 * 60_000);
  const expired = await prisma.sellerProfile.findMany({
    where: { idVerified: true, idVerifiedAt: { lt: cutoff }, OR: [{ idDocumentUrl: { not: null } }, { selfiePhotoUrl: { not: null } }] },
    select: { id: true, idDocumentUrl: true, selfiePhotoUrl: true },
  });

  for (const seller of expired) {
    await deleteDocumentBlob(seller.idDocumentUrl);
    await deleteDocumentBlob(seller.selfiePhotoUrl);
    await prisma.sellerProfile.update({ where: { id: seller.id }, data: { idDocumentUrl: null, selfiePhotoUrl: null } });
  }
}
