import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso, timeAgo } from "@/lib/utils";
import { flagHighRiskSellers } from "@/lib/services/fraud";
import { ResolveFraudFlagButton } from "./actions";

export const dynamic = "force-dynamic";

const SEVERITY_VARIANT: Record<string, "live" | "brand" | "subtle"> = {
  HIGH: "live",
  MEDIUM: "brand",
  LOW: "subtle",
};

const TYPE_LABEL: Record<string, string> = {
  NEW_ACCOUNT_HIGH_VALUE: "New account, high value",
  RAPID_ORDERING: "Rapid ordering",
  REPEAT_CANCELLATIONS: "Repeat cancellations",
  COD_ABUSE_RISK: "COD abuse risk",
  SELLER_RISK_RATE: "Seller cancellation/dispute rate",
};

export default async function AdminFraudFlagsPage() {
  // Lazy, on-view scan — same pattern as expireOverdueYardSales, since this
  // app has no cron. Cheap: early-exits per seller below a volume floor and
  // skips anyone already flagged and unresolved.
  await flagHighRiskSellers();

  const flags = await prisma.fraudFlag.findMany({
    include: {
      order: { select: { orderNumber: true, total: true } },
    },
    orderBy: [{ resolvedAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const buyerIds = [...new Set(flags.map((f) => f.buyerId).filter((id): id is string => !!id))];
  const sellerIds = [...new Set(flags.map((f) => f.sellerId).filter((id): id is string => !!id))];
  const [buyers, sellers] = await Promise.all([
    buyerIds.length > 0 ? prisma.user.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true, email: true } }) : [],
    sellerIds.length > 0 ? prisma.sellerProfile.findMany({ where: { id: { in: sellerIds } }, select: { id: true, shopName: true } }) : [],
  ]);
  const buyerLabel = (id: string | null) => (id ? buyers.find((b) => b.id === id)?.name ?? buyers.find((b) => b.id === id)?.email ?? "Unknown buyer" : null);
  const sellerLabel = (id: string | null) => (id ? sellers.find((s) => s.id === id)?.shopName ?? "Unknown seller" : null);

  const open = flags.filter((f) => !f.resolvedAt);
  const resolved = flags.filter((f) => f.resolvedAt);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Fraud Signals</h1>
      <p className="mb-6 text-sm text-ink-500">
        Automated, rule-based flags: a review queue, not a block. Nothing here stopped a transaction; each row is worth a human look.
      </p>
      {flags.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No fraud signals" />
      ) : (
        <div className="space-y-2">
          {[...open, ...resolved].map((f) => (
            <div key={f.id} className={`rounded-card border p-3.5 ${f.resolvedAt ? "border-ink-100 bg-white opacity-60" : "border-live-200 bg-live-50"}`}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="font-bold text-ink-900">{TYPE_LABEL[f.type] ?? f.type}</p>
                <Badge variant={SEVERITY_VARIANT[f.severity] ?? "subtle"}>{f.severity}</Badge>
              </div>
              <p className="text-sm text-ink-600">{f.reason}</p>
              <p className="mt-1.5 text-xs text-ink-400">
                {f.order && (
                  <>
                    Order {f.order.orderNumber} ({formatPeso(f.order.total)}) ·{" "}
                  </>
                )}
                {buyerLabel(f.buyerId) && <>Buyer: {buyerLabel(f.buyerId)} · </>}
                {sellerLabel(f.sellerId) && <>Seller: {sellerLabel(f.sellerId)} · </>}
                {timeAgo(f.createdAt)}
              </p>
              {f.resolvedAt ? (
                <p className="mt-1.5 text-xs font-semibold text-ink-500">Reviewed: {f.resolution}</p>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <ResolveFraudFlagButton flagId={f.id} />
                  {f.order && (
                    <Link href="/admin/orders" className="text-xs font-semibold text-brand-600 hover:underline">
                      View orders →
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
