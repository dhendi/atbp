import Link from "next/link";
import { Trophy, Check } from "lucide-react";
import { formatFoundingCountdown, daysUntil } from "@/lib/services/founding-seller";

interface Props {
  foundingSellerNumber: number;
  isFoundingPromoActive: boolean; // still inside the free 1-year window
  onFoundingPremium: boolean;
  foundingSellerProEndDate: Date;
  detailsHref?: string;
}

/** Compact, dashboard-scoped summary — the three strongest benefits plus a
 * countdown, not the full terms list. Full details live on /studio/plan. */
export function FoundingSellerDashboardCard({ foundingSellerNumber, isFoundingPromoActive, onFoundingPremium, foundingSellerProEndDate, detailsHref = "/studio/plan" }: Props) {
  const daysLeft = daysUntil(foundingSellerProEndDate);
  const endingSoon = isFoundingPromoActive && daysLeft <= 30;

  return (
    <div className="mb-6 overflow-hidden rounded-card border border-amber-300 bg-gradient-to-br from-amber-50 to-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-amber-800">
            <Trophy size={13} /> Founding Seller #{foundingSellerNumber}
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-ink-900">You&apos;re one of the first 200 sellers on ATBP.</p>
        </div>
        {isFoundingPromoActive && (
          <div className="rounded-2xl bg-amber-100 px-3.5 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Free Pro ends in</p>
            <p className="font-display text-lg font-semibold text-ink-900">{formatFoundingCountdown(foundingSellerProEndDate)}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 pb-4 text-sm font-semibold text-ink-800">
        <span className="flex items-center gap-1.5"><Check size={14} className="text-amber-700" /> 8% commission</span>
        <span className="flex items-center gap-1.5"><Check size={14} className="text-amber-700" /> FREE Pro for 1 year</span>
        <span className="flex items-center gap-1.5"><Check size={14} className="text-amber-700" /> Founding Premium: ₱999/mo (vs. ₱1,999/mo)</span>
      </div>

      {endingSoon && (
        <div className="border-t border-amber-200 bg-amber-100/60 px-5 py-3 text-sm text-ink-800">
          Your Founding Pro benefits end in {daysLeft} day{daysLeft === 1 ? "" : "s"}. Keep your advanced seller tools with Founding Premium for{" "}
          <span className="font-bold">₱999/month</span>.
        </div>
      )}
      {!isFoundingPromoActive && !onFoundingPremium && (
        <div className="border-t border-amber-200 bg-amber-100/60 px-5 py-3 text-sm text-ink-800">
          Your free Founding Pro period has ended. Keep going with Founding Premium for <span className="font-bold">₱999/month</span>, permanently available to you.
        </div>
      )}

      <div className="border-t border-amber-200 px-5 py-3">
        <Link href={detailsHref} className="text-xs font-bold text-amber-800 hover:underline">
          View all Founding Seller benefits →
        </Link>
      </div>
    </div>
  );
}
