"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { changeSellerPlanAction } from "@/lib/actions/monetization";
import { formatPeso } from "@/lib/utils";

interface PlanOption {
  code: string;
  name: string;
  monthlyPrice: number;
}

export function PlanActions({
  currentPlanCode, plans, subscription,
}: {
  currentPlanCode: string;
  plans: PlanOption[];
  subscription: { cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingDowngrade, setConfirmingDowngrade] = useState<string | null>(null);

  function handleChange(code: string) {
    startTransition(async () => {
      const res = await changeSellerPlanAction(code as "FREE" | "PRO" | "PREMIUM" | "FOUNDING_PREMIUM");
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(code === "FREE" ? "Your plan will move to Free at the end of this billing period." : `Welcome to ATBP ${plans.find((p) => p.code === code)?.name ?? code}!`);
      setConfirmingDowngrade(null);
    });
  }

  if (subscription?.cancelAtPeriodEnd) {
    return (
      <p className="text-sm text-ink-500">
        Your plan is set to move to Free{subscription.currentPeriodEnd ? ` on ${new Date(subscription.currentPeriodEnd).toLocaleDateString("en-PH", { month: "long", day: "numeric" })}` : ""}. You&apos;ll keep your current benefits until then.
      </p>
    );
  }

  // FOUNDING_PRO / FOUNDING_PREMIUM aren't in this ladder (they're rendered by
  // their own dedicated cards) — treat them as sitting at Pro/Premium's tier so
  // Free still reads as a downgrade instead of every option looking like an upgrade.
  const rungFor = (code: string) => (code === "FOUNDING_PRO" ? "PRO" : code === "FOUNDING_PREMIUM" ? "PREMIUM" : code);
  const currentIndex = plans.findIndex((p) => p.code === rungFor(currentPlanCode));
  const onFoundingPlan = currentPlanCode === "FOUNDING_PRO" || currentPlanCode === "FOUNDING_PREMIUM";

  return (
    <div className="flex flex-wrap gap-2">
      {plans.map((plan, i) => {
        if (plan.code === currentPlanCode) return null;
        // Standard Premium is strictly worse than Founding Premium (more, for less) — don't offer it as a "switch."
        if (currentPlanCode === "FOUNDING_PREMIUM" && plan.code === "PREMIUM") return null;
        // The free 1-year Founding Pro benefit isn't a real subscription to cancel —
        // there's nothing to "move to Free" from until it naturally lapses.
        if (currentPlanCode === "FOUNDING_PRO" && plan.code === "FREE") return null;
        const isUpgrade = onFoundingPlan ? false : i > currentIndex;

        if (!isUpgrade && plan.code !== "FREE" && confirmingDowngrade !== plan.code) {
          // Downgrading between paid tiers (e.g. Premium -> Pro) — confirm first.
          return (
            <Button key={plan.code} variant="outline" disabled={pending} onClick={() => setConfirmingDowngrade(plan.code)}>
              Switch to {plan.name}
            </Button>
          );
        }
        if (confirmingDowngrade === plan.code) {
          return (
            <div key={plan.code} className="flex items-center gap-2">
              <p className="text-sm text-ink-600">Switch to {plan.name} now?</p>
              <Button size="sm" variant="destructive" disabled={pending} onClick={() => handleChange(plan.code)}>Yes, switch</Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirmingDowngrade(null)}>Never mind</Button>
            </div>
          );
        }
        if (!isUpgrade && plan.code === "FREE") {
          return (
            <Button key={plan.code} variant="outline" disabled={pending} onClick={() => handleChange("FREE")}>
              Move to Free
            </Button>
          );
        }
        return (
          <Button key={plan.code} variant="brand" disabled={pending} onClick={() => handleChange(plan.code)}>
            {pending ? "Processing..." : `Upgrade to ${plan.name} (${plan.monthlyPrice === 0 ? "Free" : `${formatPeso(plan.monthlyPrice)}/mo`})`}
          </Button>
        );
      })}
    </div>
  );
}
