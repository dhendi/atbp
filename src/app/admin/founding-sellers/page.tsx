import Link from "next/link";
import { Trophy, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEffectiveLimits } from "@/lib/services/seller-plan";
import { getFoundingSellerAvailability } from "@/lib/services/founding-seller";
import { formatPeso } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/domain/empty-state";
import { GrantFoundingSellerForm, RevokeFoundingSellerButton } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminFoundingSellersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [availability, founders, grantCandidates] = await Promise.all([
    getFoundingSellerAvailability(),
    prisma.sellerProfile.findMany({
      where: {
        foundingSeller: true,
        ...(query ? { OR: [{ shopName: { contains: query, mode: "insensitive" } }, { handle: { contains: query, mode: "insensitive" } }] } : {}),
      },
      include: { user: true },
      orderBy: { foundingSellerNumber: "asc" },
    }),
    prisma.sellerProfile.findMany({
      where: { status: "APPROVED", foundingSeller: false },
      select: { id: true, shopName: true, handle: true },
      orderBy: { shopName: "asc" },
    }),
  ]);

  const rows = await Promise.all(
    founders.map(async (f) => {
      const [limits, gmv, orderCount] = await Promise.all([
        getEffectiveLimits(f.id),
        prisma.order.aggregate({ where: { sellerId: f.id, status: { notIn: ["PAYMENT_PENDING", "CANCELLED"] } }, _sum: { subtotal: true } }),
        prisma.order.count({ where: { sellerId: f.id, status: { notIn: ["PAYMENT_PENDING", "CANCELLED"] } } }),
      ]);
      return { seller: f, limits, gmv: gmv._sum.subtotal ?? 0, orderCount };
    })
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink-900">
          <Trophy className="text-amber-600" size={22} /> Founding 200
        </h1>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-right">
          <p className="text-lg font-extrabold text-ink-900">{availability.claimed} / {availability.limit} claimed</p>
          <p className="text-xs font-semibold text-amber-800">{availability.remaining} spots remaining</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-4">
        <h2 className="mb-1 text-sm font-bold text-ink-900">Manually grant a slot</h2>
        <p className="mb-3 text-xs text-ink-500">Bypasses the normal approval + BIR-verification requirement entirely, for the edge case where a seller should have qualified automatically but didn&apos;t.</p>
        <GrantFoundingSellerForm candidates={grantCandidates} remaining={availability.remaining} />
      </div>

      <form className="mb-5 flex items-center gap-2" action="/admin/founding-sellers">
        <div className="relative max-w-xs flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input name="q" defaultValue={query} placeholder="Search shop name or handle" className="pl-8" />
        </div>
        {query && (
          <Link href="/admin/founding-sellers" className="text-xs font-semibold text-ink-500 hover:text-ink-800">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={Trophy} title={query ? "No matching Founding Sellers" : "No Founding Sellers yet"} description={query ? undefined : "The first approved seller after this program launches will claim slot #1."} />
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink-100 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-xs font-bold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Seller</th>
                <th className="px-3 py-2.5">Approved</th>
                <th className="px-3 py-2.5">Free Pro ends</th>
                <th className="px-3 py-2.5">Current plan</th>
                <th className="px-3 py-2.5">Commission</th>
                <th className="px-3 py-2.5">GMV</th>
                <th className="px-3 py-2.5">Orders</th>
                <th className="px-3 py-2.5">Founding Premium</th>
                <th className="px-3 py-2.5">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map(({ seller, limits, gmv, orderCount }) => (
                <tr key={seller.id}>
                  <td className="px-3 py-3 font-bold text-amber-700">#{seller.foundingSellerNumber}</td>
                  <td className="px-3 py-3">
                    <Link href={`/seller/${seller.handle}`} className="font-semibold text-ink-900 hover:underline">{seller.shopName}</Link>
                    <p className="text-xs text-ink-500">@{seller.handle} · {seller.user.email}</p>
                  </td>
                  <td className="px-3 py-3 text-ink-600">{seller.foundingSellerStartDate?.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="px-3 py-3 text-ink-600">
                    {seller.foundingSellerProEndDate?.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    {limits.isFoundingPromoActive && <span className="ml-1.5 rounded-full bg-live-100 px-1.5 py-0.5 text-[10px] font-bold text-live-700">Active</span>}
                  </td>
                  <td className="px-3 py-3 font-semibold text-ink-800">{limits.planName}</td>
                  <td className="px-3 py-3 text-ink-800">{limits.transactionFeePercent}%</td>
                  <td className="px-3 py-3 font-semibold text-ink-900">{formatPeso(gmv)}</td>
                  <td className="px-3 py-3 text-ink-600">{orderCount}</td>
                  <td className="px-3 py-3">
                    {limits.planCode === "FOUNDING_PREMIUM" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">On Founding Premium</span>
                    ) : seller.foundingPremiumEligible ? (
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-600">Eligible, not active</span>
                    ) : (
                      <span className="text-xs text-ink-400">Not eligible</span>
                    )}
                  </td>
                  <td className="px-3 py-3"><RevokeFoundingSellerButton sellerId={seller.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
