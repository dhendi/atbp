import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { FoundingSellerBadge } from "@/components/domain/founding-seller-badge";
import { sellerTierBadgeLabel } from "@/lib/services/seller-tier";
import { idDocumentTypeLabel } from "@/lib/constants";
import { SellerWarningActions, ReinstateSellerButton, CloseStoreButton, ReopenStoreButton, SellerIdReviewActions } from "./actions";
import { ViewDocumentLink } from "./view-document-link";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "outline" | "live" | "subtle"> = {
  APPROVED: "success",
  PENDING: "outline",
  SUSPENDED: "live",
  CLOSED: "subtle",
};

export default async function AdminSellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seller = await prisma.sellerProfile.findUnique({
    where: { id },
    include: {
      user: true,
      warnings: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!seller) notFound();

  const activeWarnings = seller.warnings.filter((w) => w.active);
  const adminIds = [...new Set(seller.warnings.map((w) => w.issuedByAdminId))];
  const admins = adminIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true, email: true } }) : [];
  const adminLabel = (adminId: string) => admins.find((a) => a.id === adminId)?.name ?? admins.find((a) => a.id === adminId)?.email ?? "an admin";

  return (
    <div>
      <Link href="/admin/sellers" className="mb-4 flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-700">
        <ChevronLeft size={16} /> Back to Sellers
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold text-ink-900">{seller.shopName}</h1>
        <Badge variant={STATUS_VARIANT[seller.status] ?? "outline"}>{seller.status}</Badge>
        {seller.foundingSeller && <FoundingSellerBadge />}
        <Badge variant="outline">{sellerTierBadgeLabel(seller.birVerified)}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink-500">@{seller.handle} · {seller.user.email} · {seller.province ?? "N/A"}</p>
      <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-500">
        {seller.sellerKind === "BUSINESS" ? (
          <>
            Business · BIR {seller.birRegistrationNumber ?? "N/A"}
            {seller.birVerified ? (
              <span className="flex items-center gap-0.5 font-semibold text-live-600"><ShieldCheck size={12} /> Verified</span>
            ) : (
              <span className="font-semibold text-gold-600">Unverified</span>
            )}
          </>
        ) : (
          "Individual seller"
        )}
      </p>

      {seller.status === "SUSPENDED" && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-live-300 bg-live-50 p-4">
          <p className="text-sm text-live-700">Suspended pending manual review.</p>
          <ReinstateSellerButton sellerId={seller.id} />
        </div>
      )}

      {seller.status === "CLOSED" && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-ink-200 bg-ink-50 p-4">
          <div>
            <p className="text-sm font-semibold text-ink-700">Closed by the seller{seller.closedAt ? ` on ${seller.closedAt.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}` : ""}.</p>
            {seller.closeReason && <p className="mt-0.5 text-xs text-ink-500">Reason: {seller.closeReason}</p>}
          </div>
          <ReopenStoreButton sellerId={seller.id} />
        </div>
      )}

      {seller.status === "APPROVED" && (
        <div className="mt-4">
          <CloseStoreButton sellerId={seller.id} />
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold text-ink-900">Identity Verification</h2>
      {!seller.idDocumentUrl ? (
        <p className="text-sm text-ink-500">No ID submitted yet.</p>
      ) : seller.idVerified ? (
        <div className="flex items-center gap-2 rounded-2xl border border-live-200 bg-live-50 p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-live-600" />
          <div>
            <p className="text-sm font-semibold text-live-700">
              {idDocumentTypeLabel(seller.idDocumentType ?? "")} verified
              {seller.idVerifiedAt && ` on ${seller.idVerifiedAt.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}`}
            </p>
            <ViewDocumentLink sellerId={seller.id} url={seller.idDocumentUrl} documentKind="ID" label="View submitted document" />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gold-300 bg-gold-100 p-4">
          <div className="flex items-start gap-2">
            {seller.idRejectedReason ? (
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-live-600" />
            ) : (
              <Clock size={18} className="mt-0.5 shrink-0 text-gold-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-900">
                {idDocumentTypeLabel(seller.idDocumentType ?? "")}
                {seller.idSubmittedAt && ` · submitted ${seller.idSubmittedAt.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}`}
              </p>
              {seller.idRejectedReason && <p className="mt-0.5 text-xs text-live-700">Previously rejected: {seller.idRejectedReason}</p>}
              <ViewDocumentLink sellerId={seller.id} url={seller.idDocumentUrl} documentKind="ID" label="View submitted document" />
            </div>
          </div>
          <SellerIdReviewActions sellerId={seller.id} />
        </div>
      )}
      {seller.sellerKind === "BUSINESS" && seller.businessLicenseUrl && (
        <ViewDocumentLink sellerId={seller.id} url={seller.businessLicenseUrl} documentKind="BUSINESS_LICENSE" label="View BIR Certificate of Registration" />
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold text-ink-900">
        Warnings {activeWarnings.length > 0 && <span className="font-normal text-ink-500">({activeWarnings.length} active)</span>}
      </h2>
      {seller.warnings.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No warnings on this account" />
      ) : (
        <div className="space-y-2">
          {seller.warnings.map((w) => (
            <div key={w.id} className={`flex items-center gap-3 rounded-card border p-3.5 ${w.active ? "border-live-200 bg-live-50" : "border-ink-100 bg-white opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900">{w.productTitle}</p>
                <p className="text-xs text-ink-600">{w.reason}</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {w.createdAt.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })} · issued by {adminLabel(w.issuedByAdminId)}
                  {!w.active && " · cleared"}
                </p>
              </div>
              {w.active && <SellerWarningActions warningId={w.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
