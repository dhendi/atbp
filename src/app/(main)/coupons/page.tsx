import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPeso } from "@/lib/utils";
import { EmptyState } from "@/components/domain/empty-state";

// Private page: give it its own tab title (and keep it out of search results).
export const metadata = { title: "My Coupons", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/coupons");

  const coupons = await prisma.coupon.findMany({
    where: { userId: session.user.id },
    include: { campaign: true },
    orderBy: { claimedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-6 md:px-6">
      <h1 className="text-2xl font-extrabold text-ink-900">My Coupons</h1>
      <p className="mt-1 text-sm text-ink-500">Discounts tied to your account, applied automatically at checkout.</p>

      {coupons.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Gift} title="No coupons yet" description="Offers you claim, like 10% off your first purchase, will show up here." />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {coupons.map((c) => {
            const capText = c.maxDiscount != null ? `up to ${formatPeso(c.maxDiscount)}` : null;
            const valueText = c.discountType === "PERCENT" ? `${c.discountValue}% off` : `${formatPeso(c.discountValue)} off`;
            return (
              <div key={c.id} className="rounded-card border border-ink-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink-900">{c.campaign.name}</p>
                    <p className="mt-0.5 text-sm text-ink-600">
                      {valueText}
                      {capText ? `, ${capText}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-ink-200 bg-ink-50 px-3 py-2">
                  <span className="font-tag text-sm font-bold tracking-wide text-ink-800">{c.code}</span>
                  {c.status === "ACTIVE" && <span className="text-[11px] font-semibold text-live-600">Ready to use</span>}
                </div>
                {c.status === "USED" && c.usedAt && (
                  <p className="mt-2 text-xs text-ink-400">Used {c.usedAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return <span className="shrink-0 rounded-full bg-live-100 px-2.5 py-1 text-[11px] font-bold text-live-700">Active</span>;
  }
  if (status === "USED") {
    return <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-500">Used</span>;
  }
  return <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-500">Expired</span>;
}
