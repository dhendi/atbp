import { prisma } from "@/lib/prisma";
import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { Badge } from "@/components/ui/badge";
import { AddAdForm } from "./add-ad-form";
import { AdActions } from "./ad-actions";

export const dynamic = "force-dynamic";

export default async function AdminAdvertisingPage() {
  const ads = await prisma.advertisement.findMany({
    include: { campaign: { include: { advertiser: true } }, placements: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Advertising</h1>
      <p className="mb-6 text-sm text-ink-500">Third-party ads, kept separate from seller promotions. Every placement is labeled &quot;Sponsored&quot; on the storefront.</p>

      {ads.length === 0 ? (
        <EmptyState icon={Megaphone} title="No ads yet" />
      ) : (
        <div className="mb-6 space-y-2">
          {ads.map((ad) => (
            <div key={ad.id} className="flex items-center justify-between rounded-2xl border border-ink-100 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{ad.campaign.advertiser.name} · {ad.campaign.name}</p>
                <p className="text-xs text-ink-500">
                  {ad.placements.map((p) => p.placement).join(", ")} · {ad.impressions} views · {ad.clicks} clicks
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={ad.status === "ACTIVE" ? "live" : "subtle"}>{ad.status}</Badge>
                <AdActions adId={ad.id} status={ad.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-card border border-ink-100 bg-white p-4">
        <h2 className="mb-3 font-bold text-ink-900">Add an advertiser + ad</h2>
        <AddAdForm />
      </div>
    </div>
  );
}
