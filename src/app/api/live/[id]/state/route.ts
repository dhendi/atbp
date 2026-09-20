import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finalizeIfExpired } from "@/lib/services/auctions";
import { auth } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const stream = await prisma.livestream.findUnique({
    where: { id },
    include: {
      seller: true,
      products: {
        orderBy: { order: "asc" },
        include: {
          product: true,
          claimSlots: { orderBy: { slotNumber: "asc" } },
          auction: { include: { bids: { orderBy: { amount: "desc" }, take: 1 } } },
        },
      },
    },
  });
  if (!stream) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const active = stream.products.find((p) => p.status === "ACTIVE") ?? stream.products[0] ?? null;

  if (active?.auction) {
    await finalizeIfExpired(active.auction.id);
  }

  const refreshedActive = active
    ? await prisma.livestreamProduct.findUnique({
        where: { id: active.id },
        include: {
          product: true,
          claimSlots: { orderBy: { slotNumber: "asc" } },
          auction: { include: { bids: { orderBy: { createdAt: "desc" }, take: 1, include: { user: true } } } },
        },
      })
    : null;

  const chatMessages = await prisma.chatMessage.findMany({
    where: { livestreamId: id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const isFollowing = session?.user
    ? !!(await prisma.follow.findUnique({ where: { followerId_sellerId: { followerId: session.user.id, sellerId: stream.sellerId } } }))
    : false;

  return NextResponse.json({
    stream: {
      id: stream.id,
      title: stream.title,
      status: stream.status,
      viewerCount: stream.viewerCount,
      likeCount: stream.likeCount,
      thumbnailUrl: stream.thumbnailUrl,
      seller: {
        id: stream.seller.id,
        shopName: stream.seller.shopName,
        handle: stream.seller.handle,
        logoUrl: stream.seller.logoUrl,
        followerCount: stream.seller.followerCount,
      },
      isFollowing,
    },
    queue: stream.products.map((p) => ({ id: p.id, title: p.product.title, status: p.status, mode: p.mode, order: p.order })),
    active: refreshedActive
      ? {
          id: refreshedActive.id,
          mode: refreshedActive.mode,
          status: refreshedActive.status,
          product: {
            id: refreshedActive.product.id,
            title: refreshedActive.product.title,
            price: refreshedActive.product.price,
            images: refreshedActive.product.images,
            quantityAvailable: refreshedActive.product.quantityAvailable,
          },
          claimSlots: refreshedActive.claimSlots.map((s) => ({
            slotNumber: s.slotNumber,
            status: s.status,
            claimedByMe: s.claimedByUserId === session?.user?.id,
          })),
          auction: refreshedActive.auction
            ? {
                id: refreshedActive.auction.id,
                startPrice: refreshedActive.auction.startPrice,
                currentBid: refreshedActive.auction.currentBid,
                minIncrement: refreshedActive.auction.minIncrement,
                endsAt: refreshedActive.auction.endsAt,
                status: refreshedActive.auction.status,
                winnerUserId: refreshedActive.auction.winnerUserId,
                winningBid: refreshedActive.auction.winningBid,
                lastBidder: refreshedActive.auction.bids[0]?.user.name ?? null,
              }
            : null,
        }
      : null,
    chatMessages: chatMessages.reverse(),
  });
}
