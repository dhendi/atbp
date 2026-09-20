import Link from "next/link";
import Image from "next/image";
import { Gavel, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleExpiredAuctions } from "@/lib/actions/auctions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso, timeAgo } from "@/lib/utils";
import { MiniCountdown, DateCountdownLabel } from "@/components/domain/countdown";
import { AuctionRowActions } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "outline" | "subtle" | "live" | "brand"> = {
  ACTIVE: "brand",
  SCHEDULED: "outline",
  ENDED: "success",
  CANCELLED: "subtle",
};

export default async function StudioAuctionsPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  await settleExpiredAuctions();

  const products = await prisma.product.findMany({
    where: { sellerId: seller!.id, listingType: "AUCTION" },
    include: { auction: { include: { bids: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">Auctions</h1>
        <Button variant="brand" asChild>
          <Link href="/studio/products/new"><Plus size={16} /> Create Auction</Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Gavel} title="No auctions yet" description="Create a listing and choose Auction as the selling method." />
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const auction = p.auction!;
            const scheduled = auction.status === "ACTIVE" && new Date(auction.startAt) > new Date();
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-card border border-ink-100 bg-white p-3.5">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                  <Image src={(p.images as string[])[0]} alt={p.title} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{p.title}</p>
                  <p className="text-xs text-ink-500">
                    Started {formatPeso(auction.startingBid)} · {auction.bidCount} {auction.bidCount === 1 ? "bid" : "bids"}
                    {auction.reservePrice && ` · Reserve ${formatPeso(auction.reservePrice)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-tag text-sm font-bold text-ink-900">{formatPeso(auction.currentBid)}</p>
                  <p className="text-xs text-ink-500">
                    {scheduled ? (
                      <>starts <DateCountdownLabel target={auction.startAt} /></>
                    ) : auction.status === "ACTIVE" ? (
                      <MiniCountdown target={auction.endAt} />
                    ) : (
                      `ended ${timeAgo(auction.endAt)}`
                    )}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[scheduled ? "SCHEDULED" : auction.status] ?? "outline"}>{scheduled ? "SCHEDULED" : auction.status}</Badge>
                {auction.status === "ACTIVE" && <AuctionRowActions productId={p.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
