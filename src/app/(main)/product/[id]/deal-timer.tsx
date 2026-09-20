"use client";

import { Clock } from "lucide-react";
import { MiniCountdown } from "@/components/domain/countdown";

export function DealTimer({ endAt }: { endAt: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-live-600">
      <Clock size={12} /> Deal <MiniCountdown target={endAt} />
    </p>
  );
}
