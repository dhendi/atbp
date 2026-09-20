"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFollowAction } from "@/lib/actions/live";

export function DropFollowButton({ sellerId, isFollowing: initial, isLive }: { sellerId: string; isFollowing: boolean; isLive: boolean }) {
  const [following, setFollowing] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
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
          if (res.following) toast.success("We'll let you know about new drops from this seller.");
        })
      }
    >
      {following ? "Following" : isLive ? "Follow seller" : "Notify me"}
    </Button>
  );
}
