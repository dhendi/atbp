import { prisma } from "@/lib/prisma";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "outline" | "subtle" | "live" | "brand"> = {
  SUCCEEDED: "success", PAID: "success", PENDING: "outline", PROCESSING: "brand", FAILED: "live", REFUNDED: "subtle",
};

export default async function AdminTransactionsPage() {
  const [payments, payouts] = await Promise.all([
    prisma.payment.findMany({ include: { order: { include: { seller: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.payout.findMany({ include: { seller: true }, orderBy: { requestedAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Transactions</h1>
        <h2 className="mb-3 font-bold text-ink-700">Payments</h2>
        {payments.length === 0 ? (
          <EmptyState icon={Receipt} title="No payments yet" />
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-ink-100 bg-white p-3.5">
                <div>
                  <p className="font-semibold text-ink-900">{p.order.orderNumber} · {p.order.seller.shopName}</p>
                  <p className="text-xs text-ink-500">{p.provider} · {timeAgo(p.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-900">{formatPeso(p.amount)}</span>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-bold text-ink-700">Seller Payouts</h2>
        {payouts.length === 0 ? (
          <EmptyState icon={Receipt} title="No payouts yet" />
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-ink-100 bg-white p-3.5">
                <div>
                  <p className="font-semibold text-ink-900">{p.seller.shopName}</p>
                  <p className="text-xs text-ink-500">{p.method} → {p.destination} · {timeAgo(p.requestedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-900">{formatPeso(p.amount)}</span>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
