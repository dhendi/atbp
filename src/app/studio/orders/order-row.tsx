"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, Store, Bike, Download, MessageSquareText, KeyRound, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderStatusBadge } from "@/components/domain/order-status-badge";
import { FileUploader } from "@/components/domain/file-uploader";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import { deliverServiceAction } from "@/lib/actions/services";
import { MANUAL_COURIER_PRESETS } from "@/lib/shipping/providers/manual";

// DELIVERED/COMPLETED are excluded for SHIP orders — the buyer's own "Order
// received" confirmation (or the auto-confirm window) owns that transition
// once a shipment exists. A PICKUP order's seller can pick "Completed"
// directly (they physically handed it over) but SHIPPED/IN_TRANSIT make no
// sense for an in-person handoff, so they're dropped from that list. Local
// delivery/digital have no shipment at all, so they keep full manual control.
const SHIP_STATUSES = ["PAYMENT_PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "CANCELLED"];
const PICKUP_STATUSES = ["PAYMENT_PENDING", "PROCESSING", "COMPLETED", "CANCELLED"];
const OTHER_FULFILLMENT_STATUSES = ["PAYMENT_PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED", "CANCELLED"];

interface ServiceOrderInfo {
  status: string;
  packageTier: string;
  requirementsBrief: string | null;
  revisionsIncluded: number;
  revisionsUsed: number;
  dueAt: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  buyerName: string;
  itemsSummary: string;
  status: string;
  fulfillmentMethod: string;
  trackingNumber: string | null;
  courier: string | null;
  createdAgo: string;
  totalLabel: string;
  personalizationNotes: string[];
  serviceOrder?: ServiceOrderInfo | null;
}

export function OrderRow({ order }: { order: Order }) {
  const router = useRouter();
  const isShip = order.fulfillmentMethod === "SHIP";
  const isPickup = order.fulfillmentMethod === "PICKUP";
  const isService = order.fulfillmentMethod === "SERVICE";
  const isDigitalProduct = order.fulfillmentMethod === "DIGITAL_PRODUCT";
  const statuses = isShip ? SHIP_STATUSES : isPickup ? PICKUP_STATUSES : OTHER_FULFILLMENT_STATUSES;
  const [status, setStatus] = useState(order.status);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [courier, setCourier] = useState(order.courier ?? MANUAL_COURIER_PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);
  const [deliveryFiles, setDeliveryFiles] = useState<string[]>([]);
  const [deliveryMessage, setDeliveryMessage] = useState("");

  async function handleDeliver() {
    if (deliveryFiles.length === 0 && !deliveryMessage.trim()) {
      toast.error("Attach a file or write a delivery message.");
      return;
    }
    setLoading(true);
    const res = await deliverServiceAction(order.id, deliveryFiles, deliveryMessage);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Delivered to the buyer.");
    setStatus("DELIVERED");
    setDeliveryFiles([]);
    setDeliveryMessage("");
    router.refresh();
  }

  async function applyStatus(newStatus: string) {
    if (isShip && newStatus === "SHIPPED" && !order.trackingNumber && (!tracking.trim() || !courier.trim())) {
      toast.error("Enter a tracking number and courier before marking this shipped.");
      return;
    }
    setLoading(true);
    const res = await updateOrderStatusAction(order.id, newStatus, tracking || undefined, courier || undefined);
    setLoading(false);
    if (res && "error" in res) return toast.error(res.error);
    setStatus(newStatus);
    toast.success(`Order marked as ${newStatus.replace("_", " ").toLowerCase()}`);
    router.refresh();
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink-900">{order.orderNumber}</p>
          <p className="text-xs text-ink-500">{order.buyerName} · {order.createdAgo}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {order.fulfillmentMethod === "DIGITAL" && (
            <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
              <Download size={11} /> Digital
            </span>
          )}
          {order.fulfillmentMethod === "PICKUP" && (
            <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
              <Store size={11} /> Pickup
            </span>
          )}
          {order.fulfillmentMethod === "LOCAL_DELIVERY" && (
            <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
              <Bike size={11} /> Local Delivery
            </span>
          )}
          {isService && (
            <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
              <Handshake size={11} /> Service
            </span>
          )}
          {isDigitalProduct && (
            <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
              <Download size={11} /> Digital Product
            </span>
          )}
          <OrderStatusBadge status={status} />
        </div>
      </div>
      <p className="mb-1 truncate text-sm text-ink-600">{order.itemsSummary}</p>
      {order.personalizationNotes.length > 0 && (
        <div className="mb-3 space-y-1 rounded-xl bg-brand-50 p-2.5">
          {order.personalizationNotes.map((note, i) => (
            <p key={i} className="flex items-start gap-1.5 text-xs text-brand-800">
              <MessageSquareText size={13} className="mt-0.5 shrink-0" /> {note}
            </p>
          ))}
        </div>
      )}
      <div className="mb-3 text-base font-extrabold text-ink-900">{order.totalLabel}</div>

      {isShip && order.trackingNumber && (
        <p className="mb-3 text-xs text-ink-500">
          Shipped via <span className="font-semibold text-ink-700">{order.courier}</span>, tracking #{order.trackingNumber}
        </p>
      )}

      {isPickup && order.trackingNumber && (
        <p className="mb-3 flex items-center gap-1 text-xs text-ink-500">
          <KeyRound size={12} /> Buyer&apos;s pickup code: <span className="font-semibold text-ink-700">{order.trackingNumber}</span>
        </p>
      )}

      {showShipForm && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Input placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
          <Select value={courier} onValueChange={setCourier}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MANUAL_COURIER_PRESETS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isDigitalProduct ? (
        <p className="text-xs text-ink-500">
          Delivered automatically the instant the buyer paid. There&apos;s nothing for you to do here. Funds release after the dispute-safety hold window.
        </p>
      ) : isService && order.serviceOrder ? (
        <div className="space-y-3">
          {order.serviceOrder.status === "AWAITING_BRIEF" ? (
            <p className="text-xs text-ink-500">Waiting on the buyer to submit their requirements before you can start.</p>
          ) : (
            <>
              {order.serviceOrder.requirementsBrief && (
                <div className="rounded-xl bg-ink-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Requirements</p>
                  <p className="mt-0.5 text-sm text-ink-700">{order.serviceOrder.requirementsBrief}</p>
                </div>
              )}
              {order.serviceOrder.status === "DELIVERED" && (
                <p className="text-xs text-ink-500">Delivered, waiting on the buyer to accept or request a revision.</p>
              )}
              {order.serviceOrder.status === "COMPLETED" && (
                <p className="text-xs font-semibold text-live-600">Accepted: funds released.</p>
              )}
              {["IN_PROGRESS", "REVISION_REQUESTED"].includes(order.serviceOrder.status) && (
                <div className="space-y-2">
                  <FileUploader value={deliveryFiles} onChange={setDeliveryFiles} max={5} label="Attach deliverable file(s)" />
                  <Textarea placeholder="Delivery message (optional)" value={deliveryMessage} onChange={(e) => setDeliveryMessage(e.target.value)} rows={2} />
                  <Button size="sm" variant="brand" disabled={loading} onClick={handleDeliver}>
                    <Handshake size={14} /> {order.serviceOrder.status === "REVISION_REQUESTED" ? "Redeliver" : "Deliver"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={(v) => { setStatus(v); if (v === "SHIPPED") setShowShipForm(true); }}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="brand" disabled={loading} onClick={() => applyStatus(status)}>
            <Truck size={14} /> Update
          </Button>
        </div>
      )}
    </div>
  );
}
