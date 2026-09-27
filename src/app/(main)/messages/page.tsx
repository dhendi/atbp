import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/domain/empty-state";
import { timeAgo } from "@/lib/utils";
import { DeleteThreadButton } from "./delete-thread-button";

// Private page: give it its own tab title (and keep it out of search results).
export const metadata = { title: "Messages", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/messages");

  const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });

  const threads = await prisma.messageThread.findMany({
    where: sellerProfile ? { OR: [{ buyerId: session.user.id }, { sellerId: sellerProfile.id }] } : { buyerId: session.user.id },
    include: { buyer: true, seller: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6">
      <h1 className="mb-5 text-2xl font-extrabold text-ink-900">Messages</h1>
      {threads.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No messages yet"
          description="Message a seller from their profile to start a conversation."
          action={{ href: "/discover", label: "Browse ATBP" }}
        />
      ) : (
        <div className="space-y-1.5">
          {threads.map((t) => {
            const isSeller = sellerProfile?.id === t.sellerId;
            const otherName = isSeller ? t.buyer.name : t.seller.shopName;
            const otherAvatar = isSeller ? t.buyer.avatarUrl : t.seller.logoUrl;
            const lastMsg = t.messages[0];
            return (
              <div key={t.id} className="flex items-center gap-1 rounded-2xl hover:bg-ink-50">
                <Link href={`/messages/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-3">
                  <Avatar>
                    <AvatarImage src={otherAvatar ?? undefined} />
                    <AvatarFallback>{otherName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{otherName}</p>
                    <p className="truncate text-sm text-ink-500">{lastMsg?.body ?? "Say hello!"}</p>
                  </div>
                  {lastMsg && <span className="shrink-0 text-xs text-ink-400">{timeAgo(lastMsg.createdAt)}</span>}
                </Link>
                <DeleteThreadButton threadId={t.id} otherName={otherName} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
