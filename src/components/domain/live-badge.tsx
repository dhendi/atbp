import { cn } from "@/lib/utils";

export function LiveBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-live-500 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-white animate-live-pulse" />
      Live
    </span>
  );
}
