"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Gavel, Users, Star, Zap, Clock } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso, formatShortDate } from "@/lib/utils";
import { placeBidAction, buyNowAuctionAction } from "@/lib/actions/auctions";
import { isPisoFind, isRapidAuction } from "@/lib/auction-format";
import { MiniCountdown, DateCountdownLabel } from "@/components/domain/countdown";
import { SaveButton } from "@/components/domain/save-button";

export interface AuctionPanelData {
  productId: string;
  status: string; // ACTIVE | ENDED | CANCELLED
  currentBid: number;
  startingBid: number;
  startAt: string;
  bidCount: number;
  minIncrement: number;
  endAt: string;
  reservePrice: number | null;
  reserveMet: boolean;
  winnerUserId: string | null;
  buyNowPrice: number | null;
  hasReserve: boolean;
  isHighestBidder: boolean;
  isWinner: boolean;
  isSeller: boolean;
  loggedIn: boolean;
  isSaved: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AuctionPanel({ data }: { data: AuctionPanelData }) {
  const router = useRouter();
  const [ended, setEnded] = useState(data.status !== "ACTIVE");
  const [upcoming, setUpcoming] = useState(new Date(data.startAt) > new Date());
  const [amount, setAmount] = useState("");
  const [endAt, setEndAt] = useState(data.endAt);
  const [pending, startTransition] = useTransition();
  const [buyNowPending, setBuyNowPending] = useState(false);

  // Lightweight polling so the current bid / bid count / anti-sniping extensions feel live without a websocket.
  const { data: live } = useSWR(!ended && !upcoming ? `/api/auctions/${data.productId}/state` : null, fetcher, {
    refreshInterval: 6000,
  });

  // Adjust state right during render (rather than in an effect) when the SWR poll
  // reports a new endAt — e.g. an anti-sniping extension from another bidder.
  const [prevLiveEndAt, setPrevLiveEndAt] = useState(live?.endAt);
  if (live?.endAt && live.endAt !== prevLiveEndAt) {
    setPrevLiveEndAt(live.endAt);
    setEndAt(live.endAt);
  }

  const currentBid = live?.currentBid ?? data.currentBid;
  const bidCount = live?.bidCount ?? data.bidCount;
  const minNext = data.bidCount === 0 && bidCount === 0 ? data.startingBid : currentBid + data.minIncrement;
  const piso = isPisoFind(data);
  const rapid = isRapidAuction(data);

  function handleBid(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < minNext) {
      toast.error(`Enter at least ${formatPeso(minNext)}.`);
      return;
    }
    startTransition(async () => {
      const res = await placeBidAction(data.productId, value);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      if (res.extended) {
        setEndAt(res.endAt);
        toast.success("Bid placed! Time was extended because someone bid at the last minute.");
      } else {
        toast.success("Bid placed! You're the highest bidder.");
      }
      setAmount("");
      router.refresh();
    });
  }

  function handleBuyNow() {
    setBuyNowPending(true);
    (async () => {
      const res = await buyNowAuctionAction(data.productId);
      setBuyNowPending(false);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Sold! Head to My Bids to complete your purchase.");
      router.push("/bids");
    })();
  }

  if (ended || data.status !== "ACTIVE") {
    return (
      <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50 p-4">
        <p className="flex items-center gap-1.5 font-bold text-ink-900"><Gavel size={15} /> Auction ended</p>
        <p className="mt-1 text-sm text-ink-600">
          {data.winnerUserId
            ? data.isWinner
              ? "You won this auction! Complete your purchase from My Bids."
              : "This item sold to the winning bidder."
            : "This auction closed without a winning bid."}
        </p>
        {data.isWinner && (
          <Button variant="brand" className="mt-3 w-full" asChild>
            <a href="/bids">Go to My Bids</a>
          </Button>
        )}
      </div>
    );
  }

  if (upcoming) {
    return (
      <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
        <p className="flex items-center gap-1.5 font-bold text-teal-700"><Clock size={15} /> Starting soon</p>
        <p className="mt-1 text-sm text-teal-700/80">
          Bidding opens <DateCountdownLabel target={data.startAt} onExpire={() => setUpcoming(false)} /> (on {formatShortDate(data.startAt)}).
        </p>
        <div className="mt-3 flex items-baseline justify-between rounded-xl bg-white/70 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Starting bid</span>
          <span className="font-tag text-lg font-bold text-ink-900">{formatPeso(data.startingBid)}</span>
        </div>
        <p className="mt-2 text-xs text-ink-500">Ends {formatShortDate(data.endAt)}.</p>
        {data.loggedIn && !data.isSeller && (
          <div className="mt-3">
            <SaveButton productId={data.productId} initiallySaved={data.isSaved} label={data.isSaved ? "Saved, we'll notify you" : "Save to get notified when it opens"} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-ink-200 p-4">
      {(piso || rapid) && (
        <div className={`mb-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${piso ? "bg-gold-100 text-gold-600" : "bg-live-100 text-live-600"}`}>
          {piso && rapid
            ? "⚡🪙 Rapid Piso Start: started at just ₱1, and it moves fast!"
            : piso
            ? "🪙 Piso Start: this one started bidding at just ₱1!"
            : "⚡ Rapid Auction: short window, don't sleep on it!"}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Current bid</p>
          <p className="text-2xl font-bold tracking-tight text-ink-900">{formatPeso(currentBid)}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
            <Users size={12} /> {bidCount} {bidCount === 1 ? "bid" : "bids"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Time left</p>
          <p className="font-tag text-sm font-bold text-live-600">
            <MiniCountdown target={endAt} onExpire={() => setEnded(true)} />
          </p>
        </div>
      </div>

      {data.hasReserve && (
        <p className="mt-2 text-xs text-ink-500">
          {data.reserveMet || currentBid >= (data.reservePrice ?? Infinity) ? "Reserve met ✓" : "Reserve price not yet met"}
        </p>
      )}

      {data.isHighestBidder && (
        <p className="mt-2 flex items-center gap-1 text-xs font-bold text-brand-600">
          <Star size={12} className="fill-brand-500" /> You&apos;re the highest bidder
        </p>
      )}

      {data.isSeller ? (
        <p className="mt-4 text-sm text-ink-500">You can&apos;t bid on your own listing. Manage this auction from Studio.</p>
      ) : (
        <>
          <form onSubmit={handleBid} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-400">₱</span>
              <Input
                type="number"
                min={minNext}
                step={data.minIncrement}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`${minNext}`}
                className="pl-7"
              />
            </div>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? "Placing..." : "Place Bid"}
            </Button>
          </form>

          {data.buyNowPrice && (
            <Button variant="outline" className="mt-2 w-full" disabled={buyNowPending} onClick={handleBuyNow}>
              <Zap size={15} /> {buyNowPending ? "Processing..." : `Buy It Now for ${formatPeso(data.buyNowPrice)}`}
            </Button>
          )}
        </>
      )}
      <p className="mt-2 text-xs text-ink-400">
        Minimum next bid: {formatPeso(minNext)}. Bids can&apos;t be edited or withdrawn once placed.
        {" "}A bid in the last 2 minutes extends the clock by 2 minutes.
      </p>
    </div>
  );
}
