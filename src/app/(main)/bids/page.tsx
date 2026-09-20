import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gavel } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleExpiredAuctions } from "@/lib/actions/auctions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/domain/empty-state";
import { SectionHeader } from "@/components/domain/section-header";
import { MiniCountdown } from "@/components/domain/countdown";
import { formatPeso } from "@/lib/utils";
import { WonAuctionCard } from "./won-auction-card";

export const dynamic = "force-dynamic";

export default async function BidsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/bids");

  await settleExpiredAuctions();

  const myBids = await prisma.productBid.findMany({
    where: { userId: session.user.id },
    include: { auction: { include: { product: { include: { seller: true } }, bids: { orderBy: { amount: "desc" }, take: 1 } } } },
    orderBy: { createdAt: "desc" },
  });

  const seenAuctionIds = new Set<string>();
  const activeBids = [];
  const wonAuctions = [];
  for (const bid of myBids) {
    if (seenAuctionIds.has(bid.auctionId)) continue;
    seenAuctionIds.add(bid.auctionId);
    const auction = bid.auction;
    if (auction.status === "ACTIVE") {
      activeBids.push({ bid, auction, isHighest: auction.bids[0]?.userId === session.user.id });
    } else if (auction.status === "ENDED" && auction.winnerUserId === session.user.id) {
      wonAuctions.push(auction);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-4 pb-10 md:px-6 md:pt-6">
      <SectionHeader eyebrow="🔨 Bidding" title="My Bids" subtitle="Everything you're bidding on, and everything you've won" />

      <Tabs defaultValue="active" className="px-0">
        <TabsList>
          <TabsTrigger value="active">Active ({activeBids.length})</TabsTrigger>
          <TabsTrigger value="won">Won ({wonAuctions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeBids.length === 0 ? (
            <EmptyState
              icon={Gavel}
              title="No active bids"
              description="Head to Auctions to find something worth bidding on."
              action={{ href: "/auctions", label: "Browse Auctions" }}
            />
          ) : (
            <div className="space-y-2">
              {activeBids.map(({ bid, auction, isHighest }) => (
                <Link
                  key={auction.id}
                  href={`/product/${auction.product.id}`}
                  className="flex items-center gap-3 rounded-card border border-ink-200 bg-white p-3.5"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                    <Image src={(auction.product.images as string[])[0]} alt={auction.product.title} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{auction.product.title}</p>
                    <p className="text-xs text-ink-500">{auction.product.seller.shopName}</p>
                    <p className="mt-1 text-xs">
                      Your bid: <span className="font-tag font-bold">{formatPeso(bid.amount)}</span>
                      {" · "}Current: <span className="font-tag font-bold">{formatPeso(auction.currentBid)}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xs font-bold ${isHighest ? "text-brand-600" : "text-live-600"}`}>
                      {isHighest ? "Winning" : "Outbid"}
                    </p>
                    <p className="text-xs text-ink-500"><MiniCountdown target={auction.endAt} /></p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="won">
          {wonAuctions.length === 0 ? (
            <EmptyState icon={Gavel} title="No won auctions yet" description="Winning bids show up here with a checkout button." />
          ) : (
            <div className="space-y-2">
              {wonAuctions.map((auction) => (
                <WonAuctionCard
                  key={auction.id}
                  product={{
                    id: auction.product.id,
                    title: auction.product.title,
                    image: (auction.product.images as string[])[0],
                    shopName: auction.product.seller.shopName,
                    currentBid: auction.currentBid,
                    purchased: !!auction.purchasedAt,
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
