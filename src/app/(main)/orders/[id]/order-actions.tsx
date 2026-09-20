"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/domain/image-uploader";
import { cn } from "@/lib/utils";
import { cancelOrderAction, submitReviewAction, submitDisputeAction, confirmOrderReceivedAction } from "@/lib/actions/orders";

interface OrderItemOption {
  productId: string;
  title: string;
  imageUrl: string;
}

export function OrderActions({
  orderId, status, hasReview, hasDispute, items, canConfirmReceived = false, isPickup = false, disputeEligibleWhileProcessing = false, cancelDisabledReason,
}: {
  orderId: string;
  status: string;
  hasReview: boolean;
  hasDispute: boolean;
  items: OrderItemOption[];
  /** True once this order has a courier shipment that's out for delivery (or,
   * for a pickup order, once the pickup code exists) — lets the buyer confirm
   * receipt early instead of waiting for auto-confirm. */
  canConfirmReceived?: boolean;
  isPickup?: boolean;
  /** A Service/Digital Product order's Order.status sits at "PROCESSING" for
   * its entire pre-delivery lifecycle (see ServiceOrder.status instead) — set
   * this so a stalled/undelivered order can still be disputed rather than
   * only ever a DELIVERED/COMPLETED one. */
  disputeEligibleWhileProcessing?: boolean;
  /** Set (from the order page, which knows the Service/Digital-specific
   * rules cancelOrderAction itself enforces) to hide "Cancel Order" with an
   * explanation instead of letting the buyer hit a server-side rejection. */
  cancelDisabledReason?: string;
}) {
  const router = useRouter();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [lowRatingPromptOpen, setLowRatingPromptOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewProductId, setReviewProductId] = useState(items[0]?.productId ?? "");
  const [photos, setPhotos] = useState<string[]>([]);
  const [disputeReason, setDisputeReason] = useState("Item not as described");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const canCancel = ["PAYMENT_PENDING", "PROCESSING"].includes(status) && !cancelDisabledReason;
  const canReview = status === "COMPLETED" && !hasReview;
  const canDispute =
    (["SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED"].includes(status) || (disputeEligibleWhileProcessing && status === "PROCESSING")) && !hasDispute;

  async function handleCancel() {
    setLoading(true);
    const res = await cancelOrderAction(orderId);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Order cancelled");
    router.refresh();
  }

  async function handleReview() {
    setLoading(true);
    const res = await submitReviewAction(orderId, rating, comment, reviewProductId, photos);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Thanks for your review!");
    setReviewOpen(false);
    if (rating <= 2 && canDispute) {
      setLowRatingPromptOpen(true);
    }
    router.refresh();
  }

  async function handleDispute() {
    setLoading(true);
    const res = await submitDisputeAction(orderId, disputeReason, disputeDetails);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Dispute submitted. Our team will review it.");
    setDisputeOpen(false);
    router.refresh();
  }

  async function handleConfirmReceived() {
    setLoading(true);
    const res = await confirmOrderReceivedAction(orderId);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Thanks for confirming! Hope you love it.");
    router.refresh();
  }

  if (!canCancel && !canReview && !canDispute && !canConfirmReceived) return null;

  return (
    <div className="flex flex-wrap gap-2 pb-8">
      {canConfirmReceived && (
        <Button variant="brand" onClick={handleConfirmReceived} disabled={loading}>
          {isPickup ? "I Picked This Up" : "Order Received"}
        </Button>
      )}
      {canCancel && (
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
          Cancel Order
        </Button>
      )}
      {canReview && (
        <Button variant="brand" onClick={() => setReviewOpen(true)}>
          Rate Seller
        </Button>
      )}
      {canDispute && (
        <Button variant="ghost" onClick={() => setDisputeOpen(true)}>
          Report a Problem
        </Button>
      )}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate this order</DialogTitle>
            <DialogDescription>Your feedback helps other buyers shop with confidence.</DialogDescription>
          </DialogHeader>

          {items.length > 1 && (
            <div className="mb-3 space-y-1.5">
              <Label>Which item are you reviewing?</Label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {items.map((item) => (
                  <button
                    key={item.productId}
                    onClick={() => setReviewProductId(item.productId)}
                    className={cn(
                      "shrink-0 rounded-xl border-2 p-1",
                      reviewProductId === item.productId ? "border-brand-500" : "border-transparent"
                    )}
                  >
                    <span className="relative block h-14 w-14 overflow-hidden rounded-lg">
                      <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)}>
                <Star size={28} className={n <= rating ? "fill-gold-400 text-gold-400" : "text-ink-200"} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Share your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="mt-3 space-y-1.5">
            <Label>Photos (optional)</Label>
            <ImageUploader value={photos} onChange={setPhotos} max={4} compact />
          </div>
          <Button variant="brand" className="mt-4 w-full" onClick={handleReview} disabled={loading}>
            {loading ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={lowRatingPromptOpen} onOpenChange={setLowRatingPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sorry to hear that</DialogTitle>
            <DialogDescription>
              It looks like something didn&apos;t go well with this order. Want to report the problem so we can look into a refund?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setLowRatingPromptOpen(false)}>
              No thanks
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                setLowRatingPromptOpen(false);
                setDisputeOpen(true);
              }}
            >
              Report a problem
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription>We&apos;ll open a dispute and review your order.</DialogDescription>
          </DialogHeader>
          <select
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            className="mb-3 h-11 w-full rounded-xl border border-ink-200 px-3 text-sm"
          >
            <option>Item not as described</option>
            <option>Item never arrived</option>
            <option>Damaged item</option>
            <option>Wrong item received</option>
            <option>Other</option>
          </select>
          <Textarea placeholder="Tell us what happened" value={disputeDetails} onChange={(e) => setDisputeDetails(e.target.value)} />
          <Button variant="destructive" className="mt-3 w-full" onClick={handleDispute} disabled={loading}>
            Submit Dispute
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
