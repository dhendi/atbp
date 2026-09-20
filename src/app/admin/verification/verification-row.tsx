"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleSellerBadgeAction } from "@/lib/actions/admin";

interface BadgeOption {
  value: string;
  label: string;
  description: string;
}

export function VerificationRow({
  sellerId, shopName, email, badges, options,
}: { sellerId: string; shopName: string; email: string; badges: string[]; options: readonly BadgeOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-card border border-ink-100 bg-white p-3.5">
      <p className="font-bold text-ink-900">{shopName}</p>
      <p className="mb-2.5 text-xs text-ink-500">{email}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = badges.includes(opt.value);
          return (
            <button
              key={opt.value}
              title={opt.description}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await toggleSellerBadgeAction(sellerId, opt.value);
                  if ("error" in res) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(active ? `Removed ${opt.label}` : `Awarded ${opt.label}`);
                  router.refresh();
                })
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                active ? "border-teal-500 bg-teal-50 text-teal-600" : "border-ink-200 text-ink-500 hover:bg-ink-50"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
