import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { auth } from "@/lib/auth";
import { SectionHeader } from "@/components/domain/section-header";
import { AVAILABLE_PAYMENT_METHODS } from "@/lib/payments/provider";

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/payment-methods");

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pt-4 pb-10 md:px-6 md:pt-6">
      <SectionHeader eyebrow="Checkout" title="Payment methods" subtitle="Accepted ways to pay across every ATBP shop" />

      <div className="space-y-2">
        {AVAILABLE_PAYMENT_METHODS.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-600">
              <CreditCard size={17} />
            </span>
            <div>
              <p className="font-semibold text-ink-900">{m.label}</p>
              <p className="text-xs text-ink-500">{m.description}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-400">
        You&apos;ll choose one of these at checkout for each order. ATBP doesn&apos;t store card or wallet details.
      </p>
    </div>
  );
}
