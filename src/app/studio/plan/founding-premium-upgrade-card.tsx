"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeSellerPlanAction } from "@/lib/actions/monetization";

const FOUNDING_PREMIUM_CODE = "FOUNDING_PREMIUM";

export function FoundingPremiumUpgradeCard({ onFoundingPremium }: { onFoundingPremium: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleUpgrade() {
    startTransition(async () => {
      const res = await changeSellerPlanAction(FOUNDING_PREMIUM_CODE);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Welcome to Founding Premium!");
    });
  }

  if (onFoundingPremium) {
    return (
      <div className="rounded-card border border-amber-300 bg-amber-50 p-5">
        <p className="flex items-center gap-1.5 font-bold text-ink-900">
          <Trophy size={15} className="text-amber-700" /> You&apos;re on Founding Premium
        </p>
        <p className="mt-1 text-sm text-ink-600">₱999/month: your exclusive Founding Seller price, same 8% commission as standard Premium.</p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-amber-300 bg-amber-50 p-5">
      <p className="flex items-center gap-1.5 font-bold text-ink-900">
        <Trophy size={15} className="text-amber-700" /> Founding Premium is waiting for you
      </p>
      <p className="mt-1 text-sm text-ink-600">₱999/month, compared with ₱1,999/month on normal Premium. Same 8% commission either way.</p>
      <p className="mt-2 text-sm font-semibold text-live-600">You save ₱1,000/month, every month.</p>
      <Button variant="gold" className="mt-3" disabled={pending} onClick={handleUpgrade}>
        {pending ? "Processing..." : "Switch to Founding Premium (₱999/mo)"}
      </Button>
      <p className="mt-2 text-[11px] text-ink-500">You choose when to switch; this never happens automatically.</p>
    </div>
  );
}
