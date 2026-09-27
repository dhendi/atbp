"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import useSWR from "swr";
import { toast } from "sonner";
import {
  ChevronLeft, Heart, Share2, Flag, Send, Gavel, Zap, Hand, Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LiveBadge } from "@/components/domain/live-badge";
import { Countdown } from "@/components/domain/countdown";
import { formatPeso, formatCompactNumber, initials, cn } from "@/lib/utils";
import { claimAction, bidAction, buyNowAction, sendChatMessageAction, toggleFollowAction, likeLivestreamAction, shareLivestreamAction } from "@/lib/actions/live";
import { reportContentAction } from "@/lib/actions/social";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  streamId: string;
  isLoggedIn: boolean;
}

export function LiveRoom({ streamId, isLoggedIn }: Props) {
  const router = useRouter();
  const { data, mutate } = useSWR(`/api/live/${streamId}/state`, fetcher, { refreshInterval: 1500 });
  const [chatInput, setChatInput] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.chatMessages?.length]);

  if (!data || data.error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-ink-900 text-white">
        <p>Loading stream…</p>
      </div>
    );
  }

  const { stream, active, chatMessages } = data;
  const ended = stream.status === "ENDED";

  async function requireLogin(fn: () => Promise<void> | void) {
    if (!isLoggedIn) {
      toast.error("Please log in first.", { action: { label: "Log in", onClick: () => router.push("/login") } });
      return;
    }
    await fn();
  }

  async function handleFollow() {
    await requireLogin(async () => {
      const res = await toggleFollowAction(stream.seller.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(res.following ? `Following @${stream.seller.handle}` : "Unfollowed");
      mutate();
    });
  }

  async function handleClaim(slotNumber: number) {
    await requireLogin(async () => {
      const res = await claimAction(active.id, slotNumber);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
      mutate();
    });
  }

  async function handleBid(amount: number) {
    await requireLogin(async () => {
      const res = await bidAction(active.auction.id, amount);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
      mutate();
    });
  }

  async function handleBuyNow() {
    await requireLogin(async () => {
      const res = await buyNowAction(active.product.id, 1);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Reserved! Redirecting to checkout…");
      router.push(`/checkout?item=${res.cartItemId}`);
    });
  }

  async function handleSendChat() {
    if (!chatInput.trim()) return;
    await requireLogin(async () => {
      const body = chatInput;
      setChatInput("");
      const res = await sendChatMessageAction(streamId, body);
      if ("error" in res) toast.error(res.error);
      mutate();
    });
  }

  async function handleReport(reason: string, details: string) {
    await requireLogin(async () => {
      const res = await reportContentAction({
        targetType: "LIVESTREAM",
        livestreamId: streamId,
        targetLabel: stream.title,
        reason,
        details,
      });
      if ("error" in res) toast.error(res.error);
      else toast.success("Thanks, our team will review this stream.");
      setReportOpen(false);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-900 md:flex-row">
      {/* Video / stage */}
      <div className="relative flex-1 overflow-hidden">
        <Image src={stream.thumbnailUrl} alt={stream.title} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/60" />
        {ended && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white">
              <p className="text-2xl font-extrabold">Stream ended</p>
              <p className="mt-1 text-sm text-white/70">Thanks for watching {stream.seller.shopName}!</p>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button onClick={() => router.push("/live")} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
            <ChevronLeft size={22} />
          </button>
          <div className="flex items-center gap-2">
            {!ended && <LiveBadge />}
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
              <Users size={12} /> {formatCompactNumber(stream.viewerCount)}
            </span>
          </div>
        </div>

        {/* Seller row */}
        <div className="absolute left-3 top-16 flex items-center gap-2">
          <Link href={`/seller/${stream.seller.handle}`}>
            <Avatar className="h-10 w-10 ring-2 ring-white/70">
              <AvatarImage src={stream.seller.logoUrl ?? undefined} />
              <AvatarFallback>{initials(stream.seller.shopName)}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={`/seller/${stream.seller.handle}`} className="block text-sm font-bold text-white">
              @{stream.seller.handle}
            </Link>
            {stream.seller.followerCount > 0 && <span className="text-[11px] text-white/70">{formatCompactNumber(stream.seller.followerCount)} followers</span>}
          </div>
          <Button size="sm" variant={stream.isFollowing ? "subtle" : "brand"} className="ml-1 h-8 px-3 text-xs" onClick={handleFollow}>
            {stream.isFollowing ? "Following" : "Follow"}
          </Button>
        </div>

        {/* Right action rail */}
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-4">
          <button
            className="flex flex-col items-center gap-1 text-white"
            onClick={() => startTransition(() => { likeLivestreamAction(streamId); mutate(); })}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm active:scale-90">
              <Heart size={20} />
            </span>
            <span className="text-[11px] font-bold">{formatCompactNumber(stream.likeCount)}</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-white"
            onClick={() => {
              shareLivestreamAction(streamId);
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }
              toast.success("Link copied to share!");
            }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm active:scale-90">
              <Share2 size={19} />
            </span>
            <span className="text-[11px] font-bold">Share</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white" onClick={() => setReportOpen(true)}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm active:scale-90">
              <Flag size={18} />
            </span>
            <span className="text-[11px] font-bold">Report</span>
          </button>
        </div>

        {/* Chat overlay (mobile) */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 pb-2 md:hidden">
          {active && <CurrentItemCard active={active} onClaim={handleClaim} onBid={handleBid} onBuyNow={handleBuyNow} onRefresh={mutate} />}
          <div className="max-h-36 space-y-1.5 overflow-y-auto no-scrollbar">
            {chatMessages.slice(-8).map((m: ChatMsg) => (
              <ChatLine key={m.id} msg={m} />
            ))}
            <div ref={chatEndRef} />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
            className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Say something…"
              className="h-8 flex-1 bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
            />
            <button type="submit" aria-label="Send message" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Desktop sidebar: current item + chat */}
      <div className="hidden w-[380px] shrink-0 flex-col border-l border-ink-800 bg-white md:flex">
        <div className="border-b border-ink-100 p-4">
          {active ? (
            <CurrentItemCard active={active} onClaim={handleClaim} onBid={handleBid} onBuyNow={handleBuyNow} onRefresh={mutate} light />
          ) : (
            <p className="text-sm text-ink-400">No item featured right now.</p>
          )}
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {chatMessages.map((m: ChatMsg) => (
              <ChatLine key={m.id} msg={m} light />
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex items-center gap-2 border-t border-ink-100 p-3">
            <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Say something…" className="flex-1" />
            <Button type="submit" size="icon" variant="brand" aria-label="Send message">
              <Send size={16} />
            </Button>
          </form>
        </div>
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} onSubmit={handleReport} />
    </div>
  );
}

interface ChatMsg {
  id: string;
  authorName: string;
  authorAvatar?: string | null;
  body: string;
  type: string;
}

function ChatLine({ msg, light }: { msg: ChatMsg; light?: boolean }) {
  return (
    <div className="flex items-start gap-2 animate-rise-in">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={msg.authorAvatar ?? undefined} />
        <AvatarFallback className="text-[9px]">{initials(msg.authorName)}</AvatarFallback>
      </Avatar>
      <p className={cn("rounded-2xl px-2.5 py-1.5 text-xs leading-snug", light ? "bg-ink-100 text-ink-800" : "bg-black/35 text-white backdrop-blur-sm")}>
        <span className="mr-1 font-bold">{msg.authorName}</span>
        {msg.body}
      </p>
    </div>
  );
}

interface ActiveItem {
  id: string;
  mode: string;
  product: { id: string; title: string; price: number; images: string[]; quantityAvailable: number };
  claimSlots: { slotNumber: number; status: string; claimedByMe: boolean }[];
  auction: {
    id: string; startPrice: number; currentBid: number; minIncrement: number;
    endsAt: string; status: string; winnerUserId: string | null; winningBid: number | null; lastBidder: string | null;
  } | null;
}

function CurrentItemCard({
  active, onClaim, onBid, onBuyNow, onRefresh, light,
}: {
  active: ActiveItem;
  onClaim: (slot: number) => void;
  onBid: (amount: number) => void;
  onBuyNow: () => void;
  onRefresh: () => void;
  light?: boolean;
}) {
  const textClass = light ? "text-ink-900" : "text-white";
  const subClass = light ? "text-ink-500" : "text-white/75";

  return (
    <div className={cn("rounded-2xl p-3", light ? "" : "bg-black/40 backdrop-blur-md")}>
      <div className="flex gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-200">
          <Image src={active.product.images[0]} alt={active.product.title} fill className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-bold", textClass)}>{active.product.title}</p>
          <p className={cn("text-xs", subClass)}>
            {active.mode === "AUCTION" ? "Live Auction" : `${active.product.quantityAvailable} available`}
          </p>
        </div>
      </div>

      <div className="mt-3">
        {active.mode === "BUY_NOW" && (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={cn("text-lg font-extrabold", textClass)}>{formatPeso(active.product.price)}</p>
              <p className={cn("text-[11px]", subClass)}>{active.product.quantityAvailable} left</p>
            </div>
            <Button variant="live" onClick={onBuyNow} disabled={active.product.quantityAvailable <= 0}>
              <Zap size={15} /> {active.product.quantityAvailable > 0 ? "Buy Now" : "Sold Out"}
            </Button>
          </div>
        )}

        {active.mode === "CLAIM" && (
          <div>
            <p className={cn("mb-2 flex items-center gap-1 text-xs font-bold", textClass)}>
              <Hand size={13} /> {formatPeso(active.product.price)} each. Tap a number to claim
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {active.claimSlots.map((slot) => (
                <button
                  key={slot.slotNumber}
                  disabled={slot.status !== "AVAILABLE"}
                  onClick={() => onClaim(slot.slotNumber)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg text-xs font-bold transition-all active:scale-90",
                    slot.status === "AVAILABLE" && "bg-brand-500 text-white hover:bg-brand-600",
                    slot.status === "CLAIMED" && slot.claimedByMe && "bg-success-500 text-white",
                    slot.status === "CLAIMED" && !slot.claimedByMe && (light ? "bg-ink-200 text-ink-400" : "bg-white/15 text-white/40")
                  )}
                >
                  {slot.status === "CLAIMED" ? (slot.claimedByMe ? "Mine" : "✕") : `#${slot.slotNumber}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {active.mode === "AUCTION" && active.auction && (
          <AuctionBlock auction={active.auction} onBid={onBid} onRefresh={onRefresh} textClass={textClass} subClass={subClass} />
        )}
      </div>
    </div>
  );
}

function AuctionBlock({
  auction, onBid, onRefresh, textClass, subClass,
}: {
  auction: NonNullable<ActiveItem["auction"]>;
  onBid: (amount: number) => void;
  onRefresh: () => void;
  textClass: string;
  subClass: string;
}) {
  const ended = auction.status === "ENDED";
  const nextBid = auction.currentBid + auction.minIncrement;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className={cn("flex items-center gap-1 text-xs font-bold uppercase", textClass)}>
          <Gavel size={13} /> Live Auction
        </p>
        {!ended && (
          <span className="rounded-full bg-live-500 px-2 py-0.5 font-mono text-xs font-extrabold text-white">
            <Countdown target={auction.endsAt} onExpire={onRefresh} />
          </span>
        )}
      </div>

      {ended ? (
        <div className="mt-2">
          <p className={cn("text-lg font-extrabold", textClass)}>SOLD! {formatPeso(auction.winningBid ?? auction.currentBid)}</p>
          <p className={cn("text-xs", subClass)}>Winner: {auction.lastBidder ?? "No bids"}</p>
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <p className={cn("text-[11px]", subClass)}>Current bid {auction.lastBidder ? `· @${auction.lastBidder}` : ""}</p>
              <p className={cn("text-xl font-extrabold", textClass)}>{formatPeso(auction.currentBid)}</p>
            </div>
          </div>
          <Button variant="gold" className="mt-2 w-full" onClick={() => onBid(nextBid)}>
            Bid {formatPeso(nextBid)}
          </Button>
        </>
      )}
    </div>
  );
}

function ReportDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (reason: string, details: string) => void }) {
  const [reason, setReason] = useState("Inappropriate content");
  const [details, setDetails] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this livestream</DialogTitle>
          <DialogDescription>Let us know what&apos;s wrong. Our trust & safety team will review it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm"
          >
            <option>Inappropriate content</option>
            <option>Counterfeit or fake items</option>
            <option>Misleading claims/auction</option>
            <option>Harassment in chat</option>
            <option>Other</option>
          </select>
          <Textarea placeholder="Additional details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
          <Button variant="destructive" className="w-full" onClick={() => onSubmit(reason, details)}>
            Submit report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
