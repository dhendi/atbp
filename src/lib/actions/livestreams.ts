"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finalizeIfExpired } from "@/lib/services/auctions";
import { notify } from "@/lib/services/notifications";
import { LIVESTREAMS_ENABLED } from "@/lib/feature-flags";
import { sellerNotApprovedMessage } from "@/lib/constants";

async function requireSeller() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
}

export interface StreamProductInput {
  productId: string;
  mode: "BUY_NOW" | "CLAIM" | "AUCTION";
  startPrice?: number;
  minIncrement?: number;
  durationSec?: number;
}

export async function createLivestreamAction(input: {
  title: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  scheduledAt: string;
  products: StreamProductInput[];
}) {
  if (!LIVESTREAMS_ENABLED) return { error: "Live selling isn't available right now." };

  const seller = await requireSeller();
  if (!seller) return { error: "You need a seller account." };
  const notApprovedMessage = sellerNotApprovedMessage(seller.status);
  if (notApprovedMessage) return { error: notApprovedMessage };

  const stream = await prisma.livestream.create({
    data: {
      sellerId: seller.id,
      title: input.title,
      description: input.description,
      category: input.category,
      thumbnailUrl: input.thumbnailUrl || "https://picsum.photos/seed/" + Date.now() + "/900/1200",
      status: "SCHEDULED",
      scheduledAt: new Date(input.scheduledAt),
    },
  });

  let order = 0;
  for (const p of input.products) {
    await addProductInternal(stream.id, seller.id, p, order++);
  }

  const followers = await prisma.follow.findMany({ where: { sellerId: seller.id } });
  for (const f of followers) {
    await notify(f.followerId, "REMINDER", `${seller.shopName} scheduled a live!`, `"${input.title}": set a reminder so you don't miss it.`, "/live");
  }

  revalidatePath("/studio/livestreams");
  return { success: true, streamId: stream.id };
}

async function addProductInternal(livestreamId: string, sellerId: string, p: StreamProductInput, order: number) {
  // Must be the caller's own live listing: without the sellerId check a seller
  // could put ANOTHER seller's product into their stream, set its auction
  // start price to 1, and let an alt account "win" it (the order lands on the
  // victim's shop). Auction numbers are also bounded here, not trusted.
  const product = await prisma.product.findFirst({ where: { id: p.productId, sellerId, status: "ACTIVE" } });
  if (!product) return null;
  if (p.mode === "AUCTION") {
    if (p.startPrice !== undefined && (!Number.isFinite(p.startPrice) || p.startPrice < 1 || p.startPrice > 10_000_000)) return null;
    if (p.minIncrement !== undefined && (!Number.isFinite(p.minIncrement) || p.minIncrement < 1 || p.minIncrement > 1_000_000)) return null;
    if (p.durationSec !== undefined && (!Number.isInteger(p.durationSec) || p.durationSec < 30 || p.durationSec > 3600)) return null;
  }

  const lp = await prisma.livestreamProduct.create({
    data: {
      livestreamId,
      productId: p.productId,
      order,
      mode: p.mode,
      startPrice: p.mode === "AUCTION" ? p.startPrice ?? Math.round(product.price * 0.5) : null,
      minIncrement: p.mode === "AUCTION" ? p.minIncrement ?? 50 : null,
      durationSec: p.mode === "AUCTION" ? p.durationSec ?? 120 : null,
    },
  });

  if (p.mode === "CLAIM") {
    const slots = Math.min(product.quantityAvailable, 20);
    await prisma.claimSlot.createMany({
      data: Array.from({ length: slots }, (_, i) => ({ livestreamProductId: lp.id, slotNumber: i + 1 })),
    });
  }

  return lp;
}

export async function addProductToStreamAction(livestreamId: string, input: StreamProductInput) {
  const seller = await requireSeller();
  if (!seller) return { error: "Not authorized." };
  const stream = await prisma.livestream.findFirst({ where: { id: livestreamId, sellerId: seller.id } });
  if (!stream) return { error: "Livestream not found." };

  const count = await prisma.livestreamProduct.count({ where: { livestreamId } });
  const added = await addProductInternal(livestreamId, seller.id, input, count);
  if (!added) return { error: "That product can't be added to this stream." };
  revalidatePath(`/studio/livestreams/${livestreamId}`);
  revalidatePath(`/live/${livestreamId}`);
  return { success: true };
}

export async function startLiveAction(livestreamId: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "Not authorized." };
  const stream = await prisma.livestream.findFirst({ where: { id: livestreamId, sellerId: seller.id } });
  if (!stream) return { error: "Livestream not found." };

  await prisma.livestream.update({
    where: { id: livestreamId },
    data: { status: "LIVE", startedAt: new Date(), viewerCount: Math.floor(20 + Math.random() * 60) },
  });

  const first = await prisma.livestreamProduct.findFirst({ where: { livestreamId }, orderBy: { order: "asc" } });
  if (first) await featureProductInternal(first.id);

  const followers = await prisma.follow.findMany({ where: { sellerId: seller.id } });
  for (const f of followers) {
    await notify(f.followerId, "SELLER_LIVE", `${seller.shopName} is live!`, `"${stream.title}" just started.`, `/live/${livestreamId}`);
  }

  revalidatePath(`/live/${livestreamId}`);
  revalidatePath("/live");
  return { success: true };
}

export async function endLiveAction(livestreamId: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "Not authorized." };
  const stream = await prisma.livestream.findFirst({ where: { id: livestreamId, sellerId: seller.id } });
  if (!stream) return { error: "Livestream not found." };

  const runningAuctions = await prisma.auction.findMany({
    where: { status: "RUNNING", livestreamProduct: { livestreamId } },
  });
  for (const a of runningAuctions) {
    await prisma.auction.update({ where: { id: a.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    await finalizeIfExpired(a.id);
  }

  await prisma.livestreamProduct.updateMany({
    where: { livestreamId, status: { in: ["ACTIVE", "QUEUED"] } },
    data: { status: "ENDED", endedAt: new Date() },
  });

  await prisma.livestream.update({ where: { id: livestreamId }, data: { status: "ENDED", endedAt: new Date() } });

  revalidatePath(`/live/${livestreamId}`);
  revalidatePath("/live");
  return { success: true };
}

async function featureProductInternal(livestreamProductId: string) {
  const lp = await prisma.livestreamProduct.findUnique({ where: { id: livestreamProductId } });
  if (!lp) return;

  await prisma.livestreamProduct.updateMany({
    where: { livestreamId: lp.livestreamId, status: "ACTIVE" },
    data: { status: "ENDED", endedAt: new Date() },
  });

  await prisma.livestreamProduct.update({
    where: { id: livestreamProductId },
    data: { status: "ACTIVE", featuredAt: new Date() },
  });

  if (lp.mode === "AUCTION") {
    const existing = await prisma.auction.findUnique({ where: { livestreamProductId } });
    const freshEndsAt = new Date(Date.now() + (lp.durationSec ?? 120) * 1000);
    if (!existing) {
      await prisma.auction.create({
        data: {
          livestreamProductId,
          startPrice: lp.startPrice ?? 100,
          currentBid: lp.startPrice ?? 100,
          minIncrement: lp.minIncrement ?? 50,
          endsAt: freshEndsAt,
        },
      });
    } else if (existing.status !== "RUNNING" || existing.endsAt <= new Date()) {
      // Re-featuring a product (or one seeded with a stale timer) restarts its auction clock.
      await prisma.auction.update({
        where: { id: existing.id },
        data: {
          status: "RUNNING",
          currentBid: existing.startPrice,
          endsAt: freshEndsAt,
          winnerUserId: null,
          winningBid: null,
        },
      });
      await prisma.auctionBid.deleteMany({ where: { auctionId: existing.id } });
    }
  }
}

export async function featureProductAction(livestreamId: string, livestreamProductId: string) {
  const seller = await requireSeller();
  if (!seller) return { error: "Not authorized." };
  const stream = await prisma.livestream.findFirst({ where: { id: livestreamId, sellerId: seller.id } });
  if (!stream) return { error: "Livestream not found." };

  // The livestream product must belong to THIS stream: featuring another
  // stream's item would end its active item and wipe its live auction bids.
  const belongs = await prisma.livestreamProduct.findFirst({ where: { id: livestreamProductId, livestreamId }, select: { id: true } });
  if (!belongs) return { error: "That item isn't part of this stream." };
  await featureProductInternal(livestreamProductId);
  revalidatePath(`/live/${livestreamId}`);
  revalidatePath(`/studio/livestreams/${livestreamId}`);
  return { success: true };
}
