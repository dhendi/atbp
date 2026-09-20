import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso, timeAgo } from "@/lib/utils";
import { ReportActions } from "./actions";
import { ListingReportActions } from "./listing-actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "outline" | "brand" | "success" | "subtle"> = {
  OPEN: "outline",
  REVIEWED: "brand",
  RESOLVED: "success",
  DISMISSED: "subtle",
  ACTIONED: "success",
};

// Same 7-calendar-day RA 11967 redress commitment as Disputes (see
// admin/disputes/page.tsx) — a report is itself a complaint under the Terms'
// redress mechanism, so the same clock applies.
const SLA_DAYS = 7;

function slaBadge(createdAt: Date) {
  const daysOpen = (Date.now() - createdAt.getTime()) / 86400000;
  const daysLeft = Math.ceil(SLA_DAYS - daysOpen);
  if (daysLeft < 0) return { label: `Overdue ${Math.abs(daysLeft)}d`, variant: "live" as const };
  if (daysLeft <= 2) return { label: `${daysLeft}d left`, variant: "brand" as const };
  return { label: `${daysLeft}d left`, variant: "subtle" as const };
}

export default async function AdminReportsPage() {
  const [productReports, otherReports] = await Promise.all([
    prisma.report.findMany({
      where: { targetType: "PRODUCT", status: { in: ["OPEN", "REVIEWED"] } },
      include: { reporter: true, product: { include: { seller: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.findMany({
      where: { targetType: { not: "PRODUCT" } },
      include: { reporter: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Group open listing reports by product — one card per listing, newest-reported first, ties broken by report count.
  const groups = new Map<string, typeof productReports>();
  for (const r of productReports) {
    if (!r.productId) continue;
    const list = groups.get(r.productId) ?? [];
    list.push(r);
    groups.set(r.productId, list);
  }
  const listingGroups = [...groups.values()].sort((a, b) => b.length - a.length || +b[0].createdAt - +a[0].createdAt);

  const OPEN_STATUSES = ["OPEN", "REVIEWED"];
  const openOther = otherReports.filter((r) => OPEN_STATUSES.includes(r.status)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const closedOther = otherReports.filter((r) => !OPEN_STATUSES.includes(r.status));
  const sortedOtherReports = [...openOther, ...closedOther];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Reports</h1>
      <p className="mb-6 text-sm text-ink-500">Listing reports feed the same flag → warning → 3-strike-suspension flow as manual moderation.</p>

      <section className="mb-8">
        <h2 className="mb-3 font-bold text-ink-900">Listing Reports</h2>
        {listingGroups.length === 0 ? (
          <EmptyState icon={Flag} title="No open listing reports" />
        ) : (
          <div className="space-y-2">
            {listingGroups.map((reports) => {
              const product = reports[0].product;
              if (!product) return null;
              const reasons = [...new Set(reports.map((r) => r.reason))];
              const sla = slaBadge(reports[reports.length - 1].createdAt);
              return (
                <div key={product.id} className="rounded-card border border-ink-100 bg-white p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                      <Image src={(product.images as string[])[0]} alt={product.title} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/product/${product.id}`} target="_blank" className="font-bold text-ink-900 hover:underline">
                          {product.title}
                        </Link>
                        <Badge variant="live">{reports.length} report{reports.length === 1 ? "" : "s"}</Badge>
                        <Badge variant={sla.variant}>{sla.label}</Badge>
                      </div>
                      <p className="text-xs text-ink-500">
                        <Link href={`/admin/sellers/${product.sellerId}`} className="hover:underline">
                          {product.seller.shopName}
                        </Link>{" "}
                        · {formatPeso(product.price)} · {timeAgo(reports[0].createdAt)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {reasons.map((r) => (
                          <span key={r} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">{r}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <details className="mt-2.5">
                    <summary className="cursor-pointer text-xs font-semibold text-ink-500 hover:text-ink-700">
                      View {reports.length} report{reports.length === 1 ? "" : "s"}
                    </summary>
                    <div className="mt-2 space-y-1.5 border-t border-ink-100 pt-2">
                      {reports.map((r) => (
                        <p key={r.id} className="text-xs text-ink-600">
                          <span className="font-semibold">{r.reporter.name}</span>: {r.reason}
                          {r.details && <span className="text-ink-500"> (&ldquo;{r.details}&rdquo;)</span>}
                          <span className="text-ink-400"> · {timeAgo(r.createdAt)}</span>
                        </p>
                      ))}
                    </div>
                  </details>
                  <ListingReportActions productId={product.id} reasons={reasons} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">Other Reports</h2>
        {sortedOtherReports.length === 0 ? (
          <EmptyState icon={Flag} title="No other reports" description="Reported sellers and livestreams will show up here." />
        ) : (
          <div className="space-y-2">
            {sortedOtherReports.map((r) => {
              const sla = OPEN_STATUSES.includes(r.status) ? slaBadge(r.createdAt) : null;
              return (
              <div key={r.id} className="rounded-card border border-ink-100 bg-white p-3.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="font-bold text-ink-900">{r.targetType}: {r.targetLabel}</p>
                  <div className="flex items-center gap-1.5">
                    {sla && <Badge variant={sla.variant}>{sla.label}</Badge>}
                    <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status}</Badge>
                  </div>
                </div>
                <p className="text-sm text-ink-700">{r.reason}</p>
                {r.details && <p className="mt-1 text-sm text-ink-500">{r.details}</p>}
                <p className="mt-1.5 text-xs text-ink-400">Reported by {r.reporter.name} · {timeAgo(r.createdAt)}</p>
                {OPEN_STATUSES.includes(r.status) ? <ReportActions reportId={r.id} /> : null}
              </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
