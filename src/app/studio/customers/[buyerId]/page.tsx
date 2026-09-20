import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MessageCircle, ClipboardList } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrderStatusBadge } from "@/components/domain/order-status-badge";
import { EmptyState } from "@/components/domain/empty-state";
import { Button } from "@/components/ui/button";
import { formatPeso, initials, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ buyerId: string }> }) {
  const { buyerId } = await params;
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });

  // Reachable either from an order (Studio > Customers) or from a message thread
  // that never turned into a purchase — only gate on a real relationship existing,
  // not on there being an order yet.
  const [orders, thread] = await Promise.all([
    prisma.order.findMany({ where: { sellerId: seller!.id, buyerId }, include: { items: true }, orderBy: { createdAt: "desc" } }),
    prisma.messageThread.findUnique({ where: { buyerId_sellerId: { buyerId, sellerId: seller!.id } } }),
  ]);
  if (orders.length === 0 && !thread) notFound();

  const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
  if (!buyer) notFound();

  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="max-w-xl">
      <Link href="/studio/customers" className="mb-4 flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ChevronLeft size={16} /> Customers
      </Link>

      <div className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={buyer.avatarUrl ?? undefined} />
          <AvatarFallback>{initials(buyer.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-ink-900">{buyer.name}</p>
          <p className="text-sm text-ink-500">{orders.length} order{orders.length !== 1 ? "s" : ""} · {formatPeso(totalSpent)} total</p>
        </div>
        {thread && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/messages/${thread.id}`}><MessageCircle size={14} /> Message</Link>
          </Button>
        )}
      </div>

      <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wide text-ink-400">Order history with you</h2>
      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders yet" description="This buyer has messaged you but hasn't placed an order yet." />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="rounded-card border border-ink-100 bg-white p-3.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">{o.orderNumber}</p>
                <OrderStatusBadge status={o.status} />
              </div>
              <p className="truncate text-sm text-ink-600">{o.items.map((i) => i.title).join(", ")}</p>
              <div className="mt-1.5 flex items-center justify-between text-xs text-ink-500">
                <span>{timeAgo(o.createdAt)}</span>
                <span className="font-bold text-ink-900">{formatPeso(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
