import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { amIBlockedByAction } from "@/lib/actions/moderation";
import { ThreadClient } from "./thread-client";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/messages/${threadId}`);

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: { buyer: true, seller: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread) notFound();

  const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  const isParticipant = thread.buyerId === session.user.id || sellerProfile?.id === thread.sellerId;
  if (!isParticipant) notFound();

  const iAmBuyer = thread.buyerId === session.user.id;
  const otherName = iAmBuyer ? thread.seller.shopName : thread.buyer.name;
  const otherAvatar = iAmBuyer ? thread.seller.logoUrl : thread.buyer.avatarUrl;
  const otherUserId = iAmBuyer ? thread.seller.userId : thread.buyerId;
  // A buyer can see the seller's public shop page; a seller gets their own
  // customer-detail view of that buyer instead — there's no public buyer profile.
  const otherProfileHref = iAmBuyer ? `/seller/${thread.seller.handle}` : `/studio/customers/${thread.buyerId}`;

  const blockState = await amIBlockedByAction(otherUserId);

  return (
    <ThreadClient
      threadId={thread.id}
      currentUserId={session.user.id}
      otherUserId={otherUserId}
      otherName={otherName}
      otherAvatar={otherAvatar}
      otherProfileHref={otherProfileHref}
      initiallyBlockedByMe={blockState.blockedByMe}
      blockedByThem={blockState.blockedByThem}
      initialMessages={thread.messages.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, imageUrl: m.imageUrl, createdAt: m.createdAt.toISOString() }))}
    />
  );
}
