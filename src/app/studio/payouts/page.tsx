import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSellerWallet } from "@/lib/services/analytics";
import { getEffectiveLimits } from "@/lib/services/seller-plan";
import { formatPeso, timeAgo } from "@/lib/utils";
import { Wallet, Clock, CheckCircle2, Receipt } from "lucide-react";
import { PayoutForm } from "./payout-form";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  const [wallet, limits] = await Promise.all([
    getSellerWallet(seller!.id),
    getEffectiveLimits(seller!.id),
  ]);
  const payouts = await prisma.payout.findMany({ where: { sellerId: seller!.id }, orderBy: { requestedAt: "desc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Payouts</h1>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <Wallet size={17} className="mb-2 text-brand-500" />
          <p className="text-2xl font-extrabold text-ink-900">{formatPeso(wallet.availableBalance)}</p>
          <p className="text-xs text-ink-500">Available balance</p>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <Clock size={17} className="mb-2 text-gold-500" />
          <p className="text-2xl font-extrabold text-ink-900">{formatPeso(wallet.pendingBalance)}</p>
          <p className="text-xs text-ink-500">Pending (in transit orders)</p>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <CheckCircle2 size={17} className="mb-2 text-success-500" />
          <p className="text-2xl font-extrabold text-ink-900">{formatPeso(wallet.totalEarnings)}</p>
          <p className="text-xs text-ink-500">Total earnings (after {limits.transactionFeePercent}% commission)</p>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <Receipt size={17} className="mb-2 text-ink-400" />
          <p className="text-2xl font-extrabold text-ink-900">{formatPeso(wallet.platformFees + wallet.processingFees)}</p>
          <p className="text-xs text-ink-500">Commission + processing fees paid</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <PayoutForm availableBalance={wallet.availableBalance} />

        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Payout History</h2>
          {payouts.length === 0 ? (
            <p className="text-sm text-ink-400">No payouts requested yet.</p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-ink-50 px-3 py-2.5 text-sm">
                  <div>
                    <p className="flex items-center gap-1.5 font-semibold text-ink-800">
                      {formatPeso(p.amount)} via {p.method}
                      {p.instant && <span className="rounded-full bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold text-gold-700">INSTANT</span>}
                    </p>
                    <p className="text-xs text-ink-500">
                      {p.destination} · {timeAgo(p.requestedAt)}
                      {p.feeAmount > 0 && <> · -{formatPeso(p.feeAmount)} fee, {formatPeso(p.amount - p.feeAmount)} net</>}
                    </p>
                  </div>
                  <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-600">{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
