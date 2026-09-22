"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;

export function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn("px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-400", className)}
      {...props}
    />
  );
}

export function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-11 items-center justify-between gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-medium text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown size={16} className="text-ink-400" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

// Radix caps the content at the available viewport space on its own, but
// without an explicit scroll-up/down affordance and a matching max-height on
// the viewport, a list taller than that space just clips — nothing tells the
// user more items exist below, and on some inputs (touch, certain trackpads)
// there's no obvious way to reach them at all. Both pieces below exist so a
// long list (regions, provinces, a ~1,635-city dataset) stays fully reachable
// and visibly scrollable instead of silently losing its tail end.
export function SelectContent({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn("z-50 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-xl", className)}
        position="popper"
        sideOffset={6}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex h-7 cursor-default items-center justify-center bg-white text-ink-500">
          <ChevronUp size={14} />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="max-h-[min(21rem,var(--radix-select-content-available-height))] overflow-y-auto p-1.5">
          {children}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex h-7 cursor-default items-center justify-center bg-white text-ink-500">
          <ChevronDown size={14} />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2.5 pl-8 text-sm font-medium text-ink-700 outline-none data-[highlighted]:bg-ink-100 data-[highlighted]:text-ink-900",
        className
      )}
      {...props}
    >
      <span className="absolute left-2.5 inline-flex h-4 w-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check size={14} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
