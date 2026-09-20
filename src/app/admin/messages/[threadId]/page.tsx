import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/services/audit-log";

export const dynamic = "force-dynamic";

export default async function AdminMessageThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const session = await auth();

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: { buyer: true, seller: true, messages: { orderBy: { createdAt: "asc" }, include: { sender: true } } },
  });
  if (!thread) notFound();

  // Every open of a specific thread is logged — this is a privacy-sensitive
  // view, so "who looked at this conversation and when" needs its own trail
  // independent of whatever report/dispute prompted the look.
  await logAdminAction(session!.user.id, "VIEW_MESSAGE_THREAD", "MessageThread", threadId, {
    buyer: thread.buyer.email, seller: thread.seller.shopName,
  });

  return (
    <div>
      <Link href="/admin/messages" className="mb-4 flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-700">
        <ChevronLeft size={16} /> Back to Messages
      </Link>

      <div className="mb-4 rounded-2xl border border-gold-300 bg-gold-100 p-4">
        <p className="text-sm font-bold text-gold-700">Read-only Trust &amp; Safety view</p>
        <p className="mt-0.5 text-xs text-gold-700">{thread.buyer.name} ({thread.buyer.email}) ↔ {thread.seller.shopName} (@{thread.seller.handle}). This view is logged to the audit trail.</p>
      </div>

      <div className="space-y-3">
        {thread.messages.length === 0 ? (
          <p className="text-sm text-ink-500">No messages in this thread yet.</p>
        ) : (
          thread.messages.map((m) => (
            <div key={m.id} className={`max-w-lg rounded-2xl p-3 ${m.senderId === thread.buyerId ? "bg-ink-100" : "ml-auto bg-brand-100"}`}>
              <p className="text-xs font-bold text-ink-700">{m.sender.name}</p>
              {m.body && <p className="mt-0.5 text-sm text-ink-800">{m.body}</p>}
              {m.imageUrl && (
                <div className="relative mt-1.5 h-40 w-40 overflow-hidden rounded-xl">
                  <Image src={m.imageUrl} alt="Message attachment" fill className="object-cover" />
                </div>
              )}
              <p className="mt-1 text-[10px] text-ink-400">{m.createdAt.toLocaleString("en-PH")}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
