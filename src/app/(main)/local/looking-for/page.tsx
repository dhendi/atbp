import type { Metadata } from "next";
import Link from "next/link";
import { HandHeart, MapPin, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPeso, timeAgo } from "@/lib/utils";
import { getSelectedArea } from "@/lib/services/local";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { NewRequestDialog } from "./new-request-dialog";
import { getLeafCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

const LOOKING_FOR_TITLE = "Looking For";
const LOOKING_FOR_DESCRIPTION =
  "Browse buyer requests on ATBP, or post what you're hoping to find so sellers near you can reply directly.";

export const metadata: Metadata = {
  title: LOOKING_FOR_TITLE,
  description: LOOKING_FOR_DESCRIPTION,
  openGraph: { title: LOOKING_FOR_TITLE, description: LOOKING_FOR_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: LOOKING_FOR_TITLE, description: LOOKING_FOR_DESCRIPTION },
};

export default async function LookingForPage() {
  const session = await auth();
  const area = await getSelectedArea();

  const [posts, categories] = await Promise.all([
    prisma.lookingForPost.findMany({
      where: { status: "OPEN" },
      include: { category: true, user: true, replies: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    getLeafCategories(),
  ]);

  // Nearby-area requests surface first, without hiding the rest of the board.
  const sorted = area
    ? [...posts].sort((a, b) => Number(b.area === area) - Number(a.area === area))
    : posts;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pt-4 pb-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader as="h1" eyebrow="Looking For" title="What buyers are hoping to find" subtitle="Post a request, or reply if you can help" />
      </div>
      <NewRequestDialog categories={categories.map((c) => ({ id: c.id, name: c.name }))} defaultArea={area} loggedIn={!!session?.user} />

      {sorted.length === 0 ? (
        <EmptyState icon={HandHeart} title="No open requests yet" description="Be the first to post what you're hoping to find." />
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => (
            <Link key={p.id} href={`/local/looking-for/${p.id}`} className="block rounded-card border border-ink-100 bg-white p-4 hover:border-brand-300">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink-900">{p.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-600">{p.description}</p>
                </div>
                {p.userId === session?.user?.id && (
                  <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-500">Yours</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                {p.area && <span className="flex items-center gap-1"><MapPin size={11} /> {p.area}</span>}
                {p.category && <span>{p.category.name}</span>}
                {(p.budgetMin || p.budgetMax) && (
                  <span>
                    {p.budgetMin ? formatPeso(p.budgetMin) : "₱0"}
                    {p.budgetMax ? ` - ${formatPeso(p.budgetMax)}` : "+"}
                  </span>
                )}
                <span className="flex items-center gap-1"><MessageSquare size={11} /> {p.replies.length} {p.replies.length === 1 ? "reply" : "replies"}</span>
                <span>· {timeAgo(p.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
