import { prisma } from "@/lib/prisma";
import { Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso, timeAgo } from "@/lib/utils";
import { DisputeActions } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "outline" | "brand" | "success" | "subtle" | "live"> = {
  OPEN: "outline",
  UNDER_REVIEW: "brand",
  RESOLVED_REFUND: "success",
  RESOLVED_DENIED: "subtle",
  CLOSED: "subtle",
};

// The Terms of Service's redress-mechanism commitment, tracking RA 11967 (the
// Internet Transactions Act): if a complaint isn't resolved within 7 calendar
// days, the complaining party may escalate to the DTI's E-Commerce Bureau.
const SLA_DAYS = 7;
const OPEN_STATUSES = ["OPEN", "UNDER_REVIEW"];

function slaBadge(createdAt: Date) {
  const daysOpen = (Date.now() - createdAt.getTime()) / 86400000;
  const daysLeft = Math.ceil(SLA_DAYS - daysOpen);
  if (daysLeft < 0) return { label: `Overdue ${Math.abs(daysLeft)}d`, variant: "live" as const };
  if (daysLeft <= 2) return { label: `${daysLeft}d left`, variant: "brand" as const };
  return { label: `${daysLeft}d left`, variant: "subtle" as const };
}

export default async function AdminDisputesPage() {
  const disputes = await prisma.dispute.findMany({
    include: { order: { include: { seller: true } }, raisedBy: true },
    orderBy: { createdAt: "desc" },
  });
  // Open disputes surface oldest-first (most urgent against the 7-day clock);
  // resolved/closed ones stay newest-first below them.
  const open = disputes.filter((d) => OPEN_STATUSES.includes(d.status)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const resolved = disputes.filter((d) => !OPEN_STATUSES.includes(d.status));
  const sorted = [...open, ...resolved];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Disputes</h1>
      {disputes.length === 0 ? (
        <EmptyState icon={Scale} title="No disputes" />
      ) : (
        <div className="space-y-2">
          {sorted.map((d) => {
            const sla = OPEN_STATUSES.includes(d.status) ? slaBadge(d.createdAt) : null;
            return (
            <div key={d.id} className="rounded-card border border-ink-100 bg-white p-3.5">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-bold text-ink-900">{d.order.orderNumber} · {d.order.seller.shopName}</p>
                <div className="flex items-center gap-1.5">
                  {sla && <Badge variant={sla.variant}>{sla.label}</Badge>}
                  {/* Guarantee eligibility: only an order the buyer paid Buyer
                      Protection on is backed by the platform refund fund — an
                      unprotected order's dispute is still valid (the free RA
                      11967 redress path), but any refund there has to come
                      from the seller, not a guaranteed platform payout. */}
                  <Badge variant={d.order.buyerProtectionFee > 0 ? "success" : "subtle"}>
                    {d.order.buyerProtectionFee > 0 ? "Protected" : "Not protected"}
                  </Badge>
                  <Badge variant={STATUS_VARIANT[d.status] ?? "outline"}>{d.status.replace("_", " ")}</Badge>
                </div>
              </div>
              <p className="text-sm font-semibold text-ink-700">{d.reason}</p>
              <p className="mt-1 text-sm text-ink-500">{d.details}</p>
              <p className="mt-1.5 text-xs text-ink-400">
                Raised by {d.raisedBy?.name ?? `${d.order.guestEmail} (guest)`} · {formatPeso(d.order.total)} · {timeAgo(d.createdAt)}
              </p>
              {OPEN_STATUSES.includes(d.status) && <DisputeActions disputeId={d.id} status={d.status} />}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
