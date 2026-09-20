import { prisma } from "@/lib/prisma";
import { Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { formatCompactNumber } from "@/lib/utils";
import { LivestreamModerationActions } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "live" | "brand" | "subtle" | "outline"> = {
  LIVE: "live",
  SCHEDULED: "brand",
  ENDED: "subtle",
  CANCELLED: "outline",
};

export default async function AdminLivestreamsPage() {
  const streams = await prisma.livestream.findMany({ include: { seller: true }, orderBy: { scheduledAt: "desc" }, take: 100 });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Livestreams</h1>
      {streams.length === 0 ? (
        <EmptyState icon={Radio} title="No livestreams" />
      ) : (
        <div className="space-y-2">
          {streams.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{s.title}</p>
                <p className="text-xs text-ink-500">{s.seller.shopName} · {formatCompactNumber(s.peakViewers)} peak viewers</p>
              </div>
              <Badge variant={STATUS_VARIANT[s.status] ?? "outline"}>{s.status}</Badge>
              <LivestreamModerationActions livestreamId={s.id} status={s.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
