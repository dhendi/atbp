"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPeso } from "@/lib/utils";

const STANDARD_RATE = 10; // Free & Pro
const PREMIUM_RATE = 8;
const PREMIUM_PRICE = 1999;
// Monthly sales level at which the 2-point commission difference alone
// covers the subscription price — below this, Premium's other perks (unlimited
// listings, advanced tools) are the actual reason to upgrade, not the math.
const BREAKEVEN_SALES = PREMIUM_PRICE / ((STANDARD_RATE - PREMIUM_RATE) / 100);

export function PremiumSavingsCalculator({ defaultMonthlySales = 100_000 }: { defaultMonthlySales?: number }) {
  const [salesInput, setSalesInput] = useState(String(defaultMonthlySales));
  const monthlySales = Math.max(0, Number(salesInput) || 0);

  const standardCommission = monthlySales * (STANDARD_RATE / 100);
  const premiumCommission = monthlySales * (PREMIUM_RATE / 100);
  const commissionSavings = standardCommission - premiumCommission;
  const netSavings = commissionSavings - PREMIUM_PRICE;

  return (
    <div className="rounded-card border border-gold-300 bg-gold-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={17} className="text-gold-600" />
        <p className="font-bold text-ink-900">See what Premium could save you</p>
      </div>

      <div className="mb-4 space-y-1.5">
        <Label htmlFor="monthly-sales">Your monthly sales (₱)</Label>
        <Input
          id="monthly-sales"
          type="number"
          min={0}
          value={salesInput}
          onChange={(e) => setSalesInput(e.target.value)}
          className="max-w-xs bg-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Stat label="10% commission" value={formatPeso(standardCommission)} />
        <Stat label="8% commission" value={formatPeso(premiumCommission)} />
        <Stat label="Commission savings" value={formatPeso(commissionSavings)} good />
        <Stat label="Premium subscription" value={`-${formatPeso(PREMIUM_PRICE)}`} />
      </div>

      <div className="mt-4 border-t border-gold-300 pt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Net difference with Premium</p>
        <p className={`font-display text-2xl font-semibold ${netSavings >= 0 ? "text-live-600" : "text-ink-700"}`}>
          {netSavings >= 0 ? "" : "-"}{formatPeso(Math.abs(netSavings))}
          <span className="ml-1 text-sm font-normal text-ink-500">/month</span>
        </p>
        <p className="mt-2 text-xs text-ink-500">
          The lower commission alone covers Premium&apos;s subscription price once you&apos;re selling around{" "}
          <span className="font-semibold text-ink-700">{formatPeso(BREAKEVEN_SALES)}</span>/month. Below that,
          Premium&apos;s unlimited listings and other tools, not the commission difference, are the reason to upgrade.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className={`font-bold ${good ? "text-live-600" : "text-ink-900"}`}>{value}</p>
    </div>
  );
}
