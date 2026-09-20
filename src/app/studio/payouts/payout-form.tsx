"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestPayoutAction } from "@/lib/actions/payouts";
import { formatPeso } from "@/lib/utils";
import { INSTANT_PAYOUT_FEE } from "@/lib/fees";
import type { PayoutMethodId } from "@/lib/payouts/provider";

export function PayoutForm({ availableBalance }: { availableBalance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(Math.floor(availableBalance)));
  const [method, setMethod] = useState<PayoutMethodId>("GCASH");
  const [destination, setDestination] = useState("");
  const [instant, setInstant] = useState(false);
  const [loading, setLoading] = useState(false);

  const numericAmount = Number(amount) || 0;
  const netAmount = instant ? Math.max(0, numericAmount - INSTANT_PAYOUT_FEE) : numericAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await requestPayoutAction(Number(amount), method, destination, instant);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success(instant ? "Instant payout sent!" : "Payout requested!");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="h-fit space-y-4 rounded-card border border-ink-100 bg-white p-4">
      <h2 className="font-bold text-ink-900">Request Withdrawal</h2>
      <p className="text-xs text-ink-500">Available: {formatPeso(availableBalance)}</p>
      <div className="space-y-1.5">
        <Label>Amount (₱)</Label>
        <Input type="number" min={1} max={availableBalance} value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Method</Label>
        <Select value={method} onValueChange={(v) => setMethod(v as PayoutMethodId)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="GCASH">GCash</SelectItem>
            <SelectItem value="MAYA">Maya</SelectItem>
            <SelectItem value="BANK">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Account number</Label>
        <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="09171234567" required />
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
        <input
          type="checkbox"
          checked={instant}
          onChange={(e) => setInstant(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
        />
        <span>
          <span className="font-semibold">Instant payout</span>: get paid right away instead of waiting for the standard schedule, for a flat {formatPeso(INSTANT_PAYOUT_FEE)} fee.
        </span>
      </label>

      {instant && numericAmount > 0 && (
        <div className="space-y-1 rounded-xl bg-brand-50 p-3 text-sm">
          <div className="flex justify-between text-ink-600">
            <span>Instant payout fee</span>
            <span>-{formatPeso(INSTANT_PAYOUT_FEE)}</span>
          </div>
          <div className="flex justify-between font-bold text-ink-900">
            <span>You&apos;ll receive</span>
            <span>{formatPeso(netAmount)}</span>
          </div>
        </div>
      )}

      <Button type="submit" variant="brand" className="w-full" disabled={loading || availableBalance <= 0}>
        {loading ? "Requesting..." : instant ? "Send Instant Payout" : "Request Payout"}
      </Button>
    </form>
  );
}
