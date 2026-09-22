"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Pause, Play } from "lucide-react";
import { deleteProductAction, bulkUpdateProductStatusAction } from "@/lib/actions/products";

export function ProductRowActions({ productId, status, listingType }: { productId: string; status: string; listingType: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Pausing is "take this off sale without losing it" — auctions have their
  // own lifecycle (bids, a scheduled end) that a bare status flip would
  // conflict with, so only fixed-price listings get this control, same
  // restriction the existing bulk Publish/Unpublish action already enforces.
  const canPause = listingType === "FIXED" && (status === "ACTIVE" || status === "DRAFT");

  function togglePause() {
    const nextStatus = status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    startTransition(async () => {
      const res = await bulkUpdateProductStatusAction([productId], nextStatus);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(nextStatus === "ACTIVE" ? "Listing resumed" : "Listing paused");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      {canPause && (
        <button
          type="button"
          disabled={pending}
          title={status === "ACTIVE" ? "Pause listing" : "Resume listing"}
          aria-label={status === "ACTIVE" ? "Pause listing" : "Resume listing"}
          onClick={togglePause}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 disabled:opacity-40"
        >
          {status === "ACTIVE" ? <Pause size={15} /> : <Play size={15} />}
        </button>
      )}
      <Link href={`/studio/products/${productId}/edit`} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100">
        <Pencil size={15} />
      </Link>
      <button
        onClick={async () => {
          if (!confirm("Remove this product listing?")) return;
          const res = await deleteProductAction(productId);
          if ("error" in res) return toast.error(res.error);
          toast.success("Product removed");
          router.refresh();
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
