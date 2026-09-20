import { Trophy } from "lucide-react";
import { formatPeso } from "@/lib/utils";

const STANDARD_PRICE = 1999;
const FOUNDING_PRICE = 999;
const COMMISSION_RATE = 8; // identical on both — Founding Premium is a price discount only

/** Founding Premium vs. normal Premium — a flat, price-only comparison. Commission
 * is identical on both plans, so this isn't GMV-dependent like the standard Premium calculator. */
export function FoundingPremiumComparison() {
  const savings = STANDARD_PRICE - FOUNDING_PRICE;

  return (
    <div className="rounded-card border border-amber-300 bg-amber-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={17} className="text-amber-700" />
        <p className="font-bold text-ink-900">Founding Premium vs. normal Premium</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Normal Premium</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink-900">{formatPeso(STANDARD_PRICE)}<span className="text-sm font-normal text-ink-500">/mo</span></p>
          <p className="text-sm text-ink-600">{COMMISSION_RATE}% commission</p>
        </div>
        <div className="rounded-2xl border border-amber-400 bg-amber-100/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Founding Premium</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink-900">{formatPeso(FOUNDING_PRICE)}<span className="text-sm font-normal text-ink-500">/mo</span></p>
          <p className="text-sm text-ink-600">{COMMISSION_RATE}% commission</p>
        </div>
      </div>

      <div className="mt-4 border-t border-amber-300 pt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-500">You save</p>
        <p className="font-display text-2xl font-semibold text-live-600">
          {formatPeso(savings)}<span className="ml-1 text-sm font-normal text-ink-500">/month</span>
        </p>
        <p className="mt-0.5 text-xs text-ink-500">Same commission as standard Premium. The savings come entirely from the lower monthly fee.</p>
      </div>
    </div>
  );
}
