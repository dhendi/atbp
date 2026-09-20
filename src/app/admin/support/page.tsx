import { prisma } from "@/lib/prisma";
import { LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { timeAgo } from "@/lib/utils";
import { SupportTicketActions } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "outline" | "brand" | "success"> = {
  OPEN: "outline",
  IN_PROGRESS: "brand",
  RESOLVED: "success",
};

const TOPIC_LABEL: Record<string, string> = {
  ORDER: "Order & Shipping",
  PAYMENT: "Payments",
  ACCOUNT: "Account & Security",
  SELLING: "Selling on ATBP",
  OTHER: "Other",
};

export default async function AdminSupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    include: { order: { select: { orderNumber: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Support Tickets</h1>
      {tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No support requests" description="Messages from the Help Center contact form will show up here." />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-card border border-ink-100 bg-white p-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="font-bold text-ink-900">{TOPIC_LABEL[t.topic] ?? t.topic}{t.order ? ` · Order ${t.order.orderNumber}` : ""}</p>
                <Badge variant={STATUS_VARIANT[t.status] ?? "outline"}>{t.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-ink-700">{t.message}</p>
              <p className="mt-1.5 text-xs text-ink-400">{t.name} · {t.email} · {timeAgo(t.createdAt)}</p>
              {t.status !== "RESOLVED" && <SupportTicketActions ticketId={t.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
