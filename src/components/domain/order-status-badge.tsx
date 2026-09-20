import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "brand" | "live" | "gold" | "success" | "outline" | "subtle" }> = {
  PAYMENT_PENDING: { label: "Payment Pending", variant: "outline" },
  PROCESSING: { label: "Processing", variant: "brand" },
  SHIPPED: { label: "Shipped", variant: "gold" },
  IN_TRANSIT: { label: "In Transit", variant: "gold" },
  DELIVERED: { label: "Delivered", variant: "success" },
  COMPLETED: { label: "Completed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "subtle" },
  DISPUTED: { label: "Disputed", variant: "live" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "subtle" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
