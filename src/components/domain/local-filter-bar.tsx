"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Clock, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export function LocalFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openNow = searchParams.get("open") === "1";
  const pickupOnly = searchParams.get("pickup") === "1";

  function toggle(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === "1") params.delete(key);
    else params.set(key, "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Chip active={openNow} icon={Clock} label="Open now" onClick={() => toggle("open")} />
      <Chip active={pickupOnly} icon={Store} label="Offers pickup" onClick={() => toggle("pickup")} />
    </div>
  );
}

function Chip({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Clock; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors",
        active ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600 hover:border-ink-300"
      )}
    >
      <Icon size={13} /> {label}
    </button>
  );
}
