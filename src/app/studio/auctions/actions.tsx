"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelAuctionAction } from "@/lib/actions/auctions";

export function AuctionRowActions({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await cancelAuctionAction(productId);
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          toast.success("Auction ended");
          router.refresh();
        })
      }
    >
      End Early
    </Button>
  );
}
