import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClipboardList, Download } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { Button } from "@/components/ui/button";
import { formatPeso, timeAgo } from "@/lib/utils";
import { autoConfirmOverdueShipments } from "@/lib/shipping/lifecycle";
import { autoConfirmOverdueServiceOrders } from "@/lib/services/service-orders";
import { releaseOverdueDigitalProductHolds } from "@/lib/services/digital-products";
import { OrderRow } from "./order-row";

export const dynamic = "force-dynamic";

export default async function StudioOrdersPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  await Promise.all([autoConfirmOverdueShipments(), autoConfirmOverdueServiceOrders(), releaseOverdueDigitalProductHolds()]);
  const orders = await prisma.order.findMany({
    where: { sellerId: seller!.id },
    include: { buyer: true, items: true, shipment: true, serviceOrder: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">Orders</h1>
        {orders.length > 0 && (
          <Button variant="outline" size="sm" asChild>
            <a href="/api/studio/export/orders" download><Download size={14} /> Export CSV</a>
          </Button>
        )}
      </div>
      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders yet" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderRow
              key={o.id}
              order={{
                id: o.id,
                orderNumber: o.orderNumber,
                buyerName: o.buyer?.name ?? `${o.guestEmail} (guest)`,
                itemsSummary: o.items.map((i) => i.title).join(", "),
                personalizationNotes: o.items
                  .filter((i) => i.personalizationNote)
                  .map((i) => `${i.title}: ${i.personalizationNote}`),
                status: o.status,
                fulfillmentMethod: o.fulfillmentMethod,
                trackingNumber: o.shipment?.trackingNumber ?? null,
                courier: o.shipment?.courierName ?? null,
                createdAgo: timeAgo(o.createdAt),
                totalLabel: formatPeso(o.total),
                serviceOrder: o.serviceOrder
                  ? {
                      status: o.serviceOrder.status,
                      packageTier: o.serviceOrder.packageTier,
                      requirementsBrief: o.serviceOrder.requirementsBrief,
                      revisionsIncluded: o.serviceOrder.revisionsIncluded,
                      revisionsUsed: o.serviceOrder.revisionsUsed,
                      dueAt: o.serviceOrder.dueAt?.toISOString() ?? null,
                    }
                  : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
