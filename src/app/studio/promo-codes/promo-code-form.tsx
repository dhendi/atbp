"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPromoCodeAction } from "@/lib/actions/promo-codes";

export function PromoCodeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState("10");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createPromoCodeAction({
      code,
      discountType,
      discountValue: Number(discountValue),
      minSubtotal: minSubtotal ? Number(minSubtotal) : null,
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
      perUserLimit: Number(perUserLimit) || 1,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Promo code created");
    setCode("");
    setDiscountValue("10");
    setMinSubtotal("");
    setMaxRedemptions("");
    setExpiresAt("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="brand" onClick={() => setOpen(true)}>
        <Plus size={16} /> New promo code
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-2xl border border-ink-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" required className="uppercase" />
        </div>
        <div className="space-y-1.5">
          <Label>Discount type</Label>
          <Select value={discountType} onValueChange={(v) => setDiscountType(v as "PERCENT" | "FIXED")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENT">Percent off</SelectItem>
              <SelectItem value="FIXED">Fixed amount off (₱)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{discountType === "PERCENT" ? "Percent off (%)" : "Amount off (₱)"}</Label>
          <Input type="number" min={1} max={discountType === "PERCENT" ? 100 : undefined} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Minimum order (₱, optional)</Label>
          <Input type="number" min={0} value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} placeholder="No minimum" />
        </div>
        <div className="space-y-1.5">
          <Label>Max total uses (optional)</Label>
          <Input type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="Unlimited" />
        </div>
        <div className="space-y-1.5">
          <Label>Uses per buyer</Label>
          <Input type="number" min={1} value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Expires (optional)</Label>
          <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="brand" disabled={loading}>{loading ? "Creating..." : "Create code"}</Button>
        <Button type="button" variant="subtle" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
