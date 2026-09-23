"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, Check } from "lucide-react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { toggleSellerBadgeAction } from "@/lib/actions/admin";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";

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

  function toggle(value: string, label: string, active: boolean) {
    startTransition(async () => {
      const res = await toggleSellerBadgeAction(sellerId, value);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(active ? `Removed ${label}` : `Awarded ${label}`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-3.5">
      <p className="font-bold text-ink-900">{shopName}</p>
      <p className="mb-2.5 text-xs text-ink-500">{email}</p>

      {badges.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {badges.map((value) => {
            const opt = options.find((o) => o.value === value);
            if (!opt) return null;
            return (
              <span key={value} className="rounded-full border border-teal-500 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-600">
                {opt.label}
              </span>
            );
          })}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={pending}
            className="flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 transition-colors hover:bg-ink-50 disabled:opacity-50"
          >
            Manage badges <ChevronDown size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
          {options.map((opt) => {
            const active = badges.includes(opt.value);
            return (
              <DropdownMenuPrimitive.CheckboxItem
                key={opt.value}
                checked={active}
                title={opt.description}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => toggle(opt.value, opt.label, active)}
                className="flex cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 outline-none transition-colors data-[highlighted]:bg-ink-100 data-[highlighted]:text-ink-900"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    active ? "border-teal-500 bg-teal-500 text-white" : "border-ink-300"
                  )}
                >
                  {active && <Check size={11} />}
                </span>
                {opt.label}
              </DropdownMenuPrimitive.CheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
