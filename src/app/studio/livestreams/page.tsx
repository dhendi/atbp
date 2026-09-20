import Link from "next/link";
import Image from "next/image";
import { Plus, Radio } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { formatCompactNumber } from "@/lib/utils";
import { LIVESTREAMS_ENABLED } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "live" | "brand" | "subtle" | "outline"> = {
  LIVE: "live",
  SCHEDULED: "brand",
  ENDED: "subtle",
  CANCELLED: "outline",
};

export default async function StudioLivestreamsPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  const streams = await prisma.livestream.findMany({ where: { sellerId: seller!.id }, orderBy: { scheduledAt: "desc" } });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">Livestreams</h1>
        {LIVESTREAMS_ENABLED && (
          <Button variant="brand" asChild>
            <Link href="/studio/livestreams/new"><Plus size={16} /> Schedule Livestream</Link>
          </Button>
        )}
      </div>

      {!LIVESTREAMS_ENABLED ? (
        <EmptyState icon={Radio} title="Live selling is coming soon" description="We're holding off on live selling for now. Check back as ATBP grows." />
      ) : streams.length === 0 ? (
        <EmptyState icon={Radio} title="No livestreams yet" description="Schedule your first livestream to start selling live." />
      ) : (
        <div className="space-y-2">
          {streams.map((s) => (
            <Link key={s.id} href={`/studio/livestreams/${s.id}`} className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3 hover:bg-ink-50">
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                <Image src={s.thumbnailUrl} alt={s.title} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{s.title}</p>
                <p className="text-xs text-ink-500">
                  {s.status === "LIVE" ? `${formatCompactNumber(s.viewerCount)} watching` : new Date(s.scheduledAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[s.status] ?? "outline"}>{s.status}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
