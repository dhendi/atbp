"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCompactNumber } from "@/lib/utils";
import { toggleFollowAction } from "@/lib/actions/live";

interface TrendingSeller {
  id: string;
  shopName: string;
  handle: string;
  logoUrl: string | null;
  province: string | null;
  followerCount: number;
}

export function TrendingSellerRow({ rank, seller, isFollowing }: { rank: number; seller: TrendingSeller; isFollowing: boolean }) {
  const [following, setFollowing] = useState(isFollowing);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-100 p-2.5">
      <span className="w-5 shrink-0 text-center font-display text-sm font-bold text-ink-400">{rank}</span>
      <Link href={`/seller/${seller.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="h-11 w-11">
          <AvatarImage src={seller.logoUrl ?? undefined} />
          <AvatarFallback>{seller.shopName[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink-900">{seller.shopName}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            {seller.province && <span className="flex items-center gap-0.5"><MapPin size={10} /> {seller.province}</span>}
            {seller.followerCount > 0 && <span>{formatCompactNumber(seller.followerCount)} followers</span>}
          </p>
        </div>
      </Link>
      <Button
        size="sm"
        variant={following ? "subtle" : "outline"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await toggleFollowAction(seller.id);
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
