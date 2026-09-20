import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MessageCircle, Search } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Read-only, search-only visibility into buyer-seller messaging — for
 * Trust & Safety escalations, not general browsing. There's no "browse
 * every conversation" list here on purpose: an admin has to already know
 * who they're investigating (from a Report, Dispute, or support ticket)
 * and search for them by name/email/handle. Every thread OPEN (not the
 * search itself) is logged to the audit trail — see [threadId]/page.tsx.
 */
export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim();

  const threads = query
    ? await prisma.messageThread.findMany({
        where: {
          OR: [
            { buyer: { name: { contains: query, mode: "insensitive" } } },
            { buyer: { email: { contains: query, mode: "insensitive" } } },
            { seller: { shopName: { contains: query, mode: "insensitive" } } },
            { seller: { handle: { contains: query, mode: "insensitive" } } },
          ],
        },
        include: { buyer: true, seller: true, messages: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { messages: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Messages</h1>
      <p className="mb-6 text-sm text-ink-500">Read-only. Search by buyer name/email or seller shop/handle to investigate a specific report or dispute; this is not a general inbox browser.</p>

      <form className="mb-6 flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buyer name/email or seller shop/handle"
            className="w-full rounded-full border border-ink-200 py-2 pl-9 pr-4 text-sm"
          />
        </div>
        <button type="submit" className="rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>

      {!query ? (
        <EmptyState icon={MessageCircle} title="Search to view threads" description="Nothing shows until you search for a specific person." />
      ) : threads.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No matching threads" />
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/admin/messages/${t.id}`}
              className="flex items-center justify-between rounded-card border border-ink-100 bg-white p-3.5 hover:border-ink-300"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900">{t.buyer.name} ↔ {t.seller.shopName}</p>
                <p className="truncate text-xs text-ink-500">{t.messages[0]?.body ?? "No messages yet"}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-ink-400">
                <p>{t._count.messages} message{t._count.messages === 1 ? "" : "s"}</p>
                {t.messages[0] && <p>{timeAgo(t.messages[0].createdAt)}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
