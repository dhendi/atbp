import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-ink-900 text-white",
        brand: "bg-brand-100 text-brand-700",
        live: "bg-live-500 text-white",
        gold: "bg-gold-100 text-gold-600",
        success: "bg-success-100 text-success-500",
        outline: "border border-ink-200 text-ink-600",
        subtle: "bg-ink-100 text-ink-600 normal-case font-semibold tracking-normal",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
