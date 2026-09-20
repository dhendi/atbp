import { prisma } from "@/lib/prisma";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso, timeAgo } from "@/lib/utils";
import { OrderStatusAction } from "./actions";
import { ServiceDigitalDetails } from "./service-digital-details";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "outline" | "subtle" | "live" | "brand"> = {
  PAYMENT_PENDING: "outline",
  PROCESSING: "brand",
  SHIPPED: "brand",
  IN_TRANSIT: "brand",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "subtle",
  DISPUTED: "live",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      buyer: true, seller: true,
      serviceOrder: true,
      items: { include: { digitalDownloadTokens: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Orders</h1>
      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders yet" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink-100 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase text-ink-400">
                <th className="p-3">Order</th>
                <th className="p-3">Buyer</th>
                <th className="p-3">Seller</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Placed</th>
                <th className="p-3">Admin</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-ink-50 last:border-0">
                  <td className="p-3 font-semibold text-ink-900">{o.orderNumber}</td>
                  <td className="p-3 text-ink-600">{o.buyer?.name ?? `${o.guestEmail} (guest)`}</td>
                  <td className="p-3 text-ink-600">{o.seller.shopName}</td>
                  <td className="p-3 font-semibold text-ink-900">{formatPeso(o.total)}</td>
                  <td className="p-3"><Badge variant={STATUS_VARIANT[o.status] ?? "outline"}>{o.status.replace(/_/g, " ")}</Badge></td>
                  <td className="p-3 text-xs text-ink-400">{timeAgo(o.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex flex-col items-start gap-1">
                      <OrderStatusAction orderId={o.id} currentStatus={o.status} disputed={o.status === "DISPUTED"} />
                      <ServiceDigitalDetails
                        serviceOrder={o.serviceOrder ? { id: o.serviceOrder.id, status: o.serviceOrder.status } : null}
                        tokens={o.items.flatMap((i) => i.digitalDownloadTokens.map((t) => ({
                          id: t.id, title: i.title, revoked: t.revoked, downloadCount: t.downloadCount, maxDownloads: t.maxDownloads, expiresAt: t.expiresAt.toISOString(),
                        })))}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
