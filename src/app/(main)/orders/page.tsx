import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Package, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso, timeAgo } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/domain/order-status-badge";
import { autoConfirmOverdueShipments } from "@/lib/shipping/lifecycle";
import { autoConfirmOverdueServiceOrders } from "@/lib/services/service-orders";
import { releaseOverdueDigitalProductHolds } from "@/lib/services/digital-products";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/orders");

  await Promise.all([autoConfirmOverdueShipments(), autoConfirmOverdueServiceOrders(), releaseOverdueDigitalProductHolds()]);

  const orders = await prisma.order.findMany({
    where: { buyerId: session.user.id },
    include: { items: true, seller: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink-900">My Orders</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">Continue Shopping <ArrowRight size={14} /></Link>
        </Button>
      </div>
      {orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" description="Your purchases from live streams and the marketplace will show up here." />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-card border border-ink-100 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink-900">{order.orderNumber}</p>
                  <p className="text-xs text-ink-500">{order.seller.shopName} · {timeAgo(order.createdAt)}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="flex gap-2">
                {order.items.slice(0, 4).map((item) => (
                  <div key={item.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                    <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-xs text-ink-500">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                <span className="font-extrabold text-ink-900">{formatPeso(order.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
