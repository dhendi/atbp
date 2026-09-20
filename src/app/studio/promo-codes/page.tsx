import { Ticket } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso } from "@/lib/utils";
import { PromoCodeForm } from "./promo-code-form";
import { PromoCodeActions } from "./promo-code-actions";

export const dynamic = "force-dynamic";

export default async function StudioPromoCodesPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });

  const codes = await prisma.promoCode.findMany({
    where: { sellerId: seller!.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">Promo Codes</h1>
        <PromoCodeForm />
      </div>

      {codes.length === 0 ? (
        <EmptyState icon={Ticket} title="No promo codes yet" description="Create a code buyers can enter at checkout for a discount on your shop's items." />
      ) : (
        <div className="space-y-2">
          {codes.map((c) => {
            const expired = c.expiresAt && c.expiresAt < new Date();
            const usedUp = c.maxRedemptions !== null && c.redemptionCount >= c.maxRedemptions;
            const status = expired ? "Expired" : usedUp ? "Used up" : c.active ? "Active" : "Inactive";
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-card border border-ink-100 bg-white p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-tag text-sm font-extrabold tracking-wide text-ink-900">{c.code}</p>
                  <p className="text-xs text-ink-500">
                    {c.discountType === "PERCENT" ? `${c.discountValue}% off` : `${formatPeso(c.discountValue)} off`}
                    {c.minSubtotal ? ` · Min. order ${formatPeso(c.minSubtotal)}` : ""}
                    {" · "}{c.redemptionCount} used{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                  </p>
                </div>
                <Badge variant={status === "Active" ? "success" : status === "Inactive" ? "subtle" : "outline"}>{status}</Badge>
                <PromoCodeActions id={c.id} active={c.active} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
