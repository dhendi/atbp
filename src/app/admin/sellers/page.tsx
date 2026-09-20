import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Store, ShieldCheck, OctagonAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { FoundingSellerBadge } from "@/components/domain/founding-seller-badge";
import { formatCompactNumber } from "@/lib/utils";
import { purgeExpiredIdDocuments } from "@/lib/services/document-retention";
import { SellerModerationActions } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "outline" | "live" | "subtle"> = {
  APPROVED: "success",
  PENDING: "outline",
  SUSPENDED: "live",
  CLOSED: "subtle",
};

export default async function AdminSellersPage() {
  // Lazy, on-view retention cleanup — same pattern as expireOverdueYardSales,
  // since this app has no cron. See purgeExpiredIdDocuments for what it does.
  await purgeExpiredIdDocuments();

  const sellers = await prisma.sellerProfile.findMany({
    include: { user: true, _count: { select: { warnings: { where: { active: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Sellers</h1>
      {sellers.length === 0 ? (
        <EmptyState icon={Store} title="No sellers yet" />
      ) : (
        <div className="space-y-2">
          {sellers.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-card border border-ink-100 bg-white p-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-bold text-ink-900">
                  <Link href={`/admin/sellers/${s.id}`} className="hover:underline">{s.shopName}</Link>
                  <Badge variant={STATUS_VARIANT[s.status] ?? "outline"}>{s.status}</Badge>
                  {s.foundingSeller && <FoundingSellerBadge />}
                  {s._count.warnings > 0 && (
                    <span className="flex items-center gap-0.5 text-xs font-bold text-live-600">
                      <OctagonAlert size={12} /> {s._count.warnings} warning{s._count.warnings === 1 ? "" : "s"}
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-500">@{s.handle} · {s.user.email} · {s.province ?? "N/A"}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                  {s.sellerKind === "BUSINESS" ? (
                    <>
                      Business · BIR {s.birRegistrationNumber ?? "N/A"}
                      {s.birVerified ? (
                        <span className="flex items-center gap-0.5 font-semibold text-live-600"><ShieldCheck size={12} /> Verified</span>
                      ) : (
                        <span className="font-semibold text-gold-600">Unverified</span>
                      )}
                    </>
                  ) : (
                    "Individual seller"
                  )}
                </p>
              </div>
              <div className="text-right text-xs text-ink-500">
                {formatCompactNumber(s.followerCount)} followers · {formatCompactNumber(s.totalSales)} sales
              </div>
              <SellerModerationActions sellerId={s.id} status={s.status} sellerKind={s.sellerKind} birVerified={s.birVerified} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
