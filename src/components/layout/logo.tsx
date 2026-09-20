import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {/* terracotta petal — upper left */}
      <path
        d="M46 47 C 34 45, 20 38, 14 24 C 12 19, 15 15, 20 16 C 34 19, 43 31, 47 44 Z"
        fill="#C95532"
      />
      {/* live-red bar petal — right */}
      <path
        d="M49 49 C 58 44, 72 38, 84 39 C 90 39, 92 44, 88 48 C 78 57, 62 56, 50 52 Z"
        fill="#DF3826"
      />
      {/* pink petal — lower left */}
      <path
        d="M46 51 C 45 63, 40 77, 28 85 C 23 88, 18 85, 19 79 C 22 65, 33 55, 45 50 Z"
        fill="#F2ADA8"
      />
      {/* blue petal — lower right */}
      <path
        d="M51 51 C 60 60, 70 72, 71 86 C 71 92, 66 94, 62 90 C 53 79, 49 64, 50 50 Z"
        fill="#4C6FA3"
      />
      {/* gold dot */}
      <circle cx="53" cy="20" r="7" fill="#E9A52F" />
      {/* sparkle */}
      <path
        d="M72 22 L74.5 27.5 L80 30 L74.5 32.5 L72 38 L69.5 32.5 L64 30 L69.5 27.5 Z"
        fill="#4A2C20"
      />
    </svg>
  );
}

export function Logo({ className, subtitle = true }: { className?: string; subtitle?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 group", className)}>
      <LogoMark className="h-9 w-9 shrink-0 transition-transform group-active:scale-95" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-semibold tracking-tight text-ink-900">ATBP</span>
        {subtitle && <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 -mt-0.5">at iba pa</span>}
      </span>
    </Link>
  );
}
