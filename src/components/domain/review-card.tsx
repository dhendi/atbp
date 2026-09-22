"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Star, ThumbsUp, ThumbsDown, ShieldCheck, Store, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { voteReviewAction, submitSellerResponseAction } from "@/lib/actions/reviews";
import { cn, timeAgo } from "@/lib/utils";

export interface ReviewCardData {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[];
  createdAt: string;
  buyerName: string;
  buyerReviewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  viewerVote: boolean | null;
  sellerResponse: string | null;
  sellerRespondedAt: string | null;
  canRespond: boolean;
  hidden?: boolean;
}

/** A single review — rating, "Verified Purchase" (structural: every review on
 * ATBP requires a COMPLETED order, see submitReviewAction), the reviewer's
 * own review count if they've written more than one, helpful/not-helpful
 * voting, and the seller's own public response if they've written one.
 * Shared across the product page, seller profile, and Studio's own Reviews
 * list rather than three separate render paths. */
export function ReviewCard({ review, extra }: { review: ReviewCardData; extra?: React.ReactNode }) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [notHelpfulCount, setNotHelpfulCount] = useState(review.notHelpfulCount);
  const [viewerVote, setViewerVote] = useState(review.viewerVote);
  const [voting, startVoting] = useTransition();

  const [responding, setResponding] = useState(false);
  const [responseDraft, setResponseDraft] = useState(review.sellerResponse ?? "");
  const [sellerResponse, setSellerResponse] = useState(review.sellerResponse);
  const [sellerRespondedAt, setSellerRespondedAt] = useState(review.sellerRespondedAt);
  const [submittingResponse, startSubmittingResponse] = useTransition();

  function vote(helpful: boolean) {
    startVoting(async () => {
      const res = await voteReviewAction(review.id, helpful);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setHelpfulCount(res.helpfulCount);
      setNotHelpfulCount(res.notHelpfulCount);
      setViewerVote(res.viewerVote);
    });
  }

  function submitResponse() {
    startSubmittingResponse(async () => {
      const res = await submitSellerResponseAction(review.id, responseDraft);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setSellerResponse(responseDraft.trim());
      setSellerRespondedAt(new Date().toISOString());
      setResponding(false);
      toast.success("Response posted");
    });
  }

  return (
    <div className={cn("rounded-2xl border p-3.5", review.hidden ? "border-ink-100 bg-ink-50 opacity-70" : "border-ink-200 bg-white")}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5">
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-ink-900">
          {review.buyerName}
          {review.buyerReviewCount > 1 && (
            <span className="text-xs font-semibold text-ink-400">· {review.buyerReviewCount} reviews</span>
          )}
        </span>
        <div className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={13} className={i < review.rating ? "fill-gold-400 text-gold-400" : "text-ink-200"} />
          ))}
        </div>
      </div>

      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
        <span className="flex items-center gap-1 font-semibold text-live-600" title="This reviewer completed a real order for this purchase.">
          <ShieldCheck size={12} /> Verified Purchase
        </span>
        <span>{timeAgo(review.createdAt)}</span>
        {extra}
      </div>

      {review.comment && <p className="text-sm text-ink-600">{review.comment}</p>}

      {review.photos.length > 0 && (
        <div className="mt-2 flex gap-2">
          {review.photos.map((url, i) => (
            <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl bg-ink-100">
              <Image src={url} alt={`Photo from ${review.buyerName}'s review, ${i + 1} of ${review.photos.length}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      )}

      {!review.hidden && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-xs text-ink-400">Was this helpful?</span>
          <button
            type="button"
            disabled={voting}
            onClick={() => vote(true)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50",
              viewerVote === true ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-500 hover:bg-ink-50"
            )}
          >
            <ThumbsUp size={12} /> {helpfulCount > 0 && helpfulCount}
          </button>
          <button
            type="button"
            disabled={voting}
            onClick={() => vote(false)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50",
              viewerVote === false ? "border-ink-500 bg-ink-100 text-ink-800" : "border-ink-200 text-ink-500 hover:bg-ink-50"
            )}
          >
            <ThumbsDown size={12} /> {notHelpfulCount > 0 && notHelpfulCount}
          </button>
        </div>
      )}

      {sellerResponse && !responding ? (
        <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-bold text-ink-800">
              <Store size={12} className="text-brand-500" /> Response from the seller
            </p>
            {review.canRespond && (
              <button type="button" onClick={() => { setResponseDraft(sellerResponse); setResponding(true); }} className="flex items-center gap-1 text-xs font-semibold text-ink-400 hover:text-ink-700">
                <Pencil size={11} /> Edit
              </button>
            )}
          </div>
          <p className="text-sm text-ink-600">{sellerResponse}</p>
          {sellerRespondedAt && <p className="mt-1 text-[11px] text-ink-400">{timeAgo(sellerRespondedAt)}</p>}
        </div>
      ) : review.canRespond && responding ? (
        <div className="mt-3 space-y-2 rounded-xl border border-ink-200 p-3">
          <Textarea
            value={responseDraft}
            onChange={(e) => setResponseDraft(e.target.value)}
            placeholder="Thank the buyer, or address anything they raised — this will be shown publicly."
            className="min-h-20 text-sm"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="brand" disabled={submittingResponse} onClick={submitResponse}>
              {submittingResponse ? "Posting..." : "Post response"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={submittingResponse} onClick={() => setResponding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : review.canRespond ? (
        <button type="button" onClick={() => setResponding(true)} className="mt-2.5 text-xs font-bold text-brand-600 hover:underline">
          Respond to this review
        </button>
      ) : null}
    </div>
  );
}
