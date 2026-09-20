"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFollowAction } from "@/lib/actions/live";
import { sendMessageAction } from "@/lib/actions/social";
import { AddToCollectionButton } from "@/components/domain/add-to-collection-button";
import { ShareButton } from "@/components/domain/share-button";

export function SellerActions({
  sellerId, isFollowing: initial, shareUrl, shopName,
}: {
  sellerId: string;
  isFollowing: boolean;
  shareUrl: string;
  shopName: string;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <ShareButton url={shareUrl} title={shopName} iconOnly />
      <AddToCollectionButton item={{ sellerId }} iconOnly />
      <Button
        variant="outline"
        onClick={() =>
          startTransition(async () => {
            const res = await sendMessageAction(sellerId, "Hi! I'm interested in your products.");
            if ("error" in res) {
              toast.error(res.error);
              return;
            }
            router.push(`/messages/${res.threadId}`);
          })
        }
      >
        <MessageCircle size={15} />
      </Button>
      <Button
        variant={following ? "subtle" : "brand"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await toggleFollowAction(sellerId);
            if ("error" in res) {
              toast.error(res.error);
              return;
            }
            setFollowing(!!res.following);
          })
        }
      >
        {following ? "Following" : "Follow"}
      </Button>
    </div>
  );
}
