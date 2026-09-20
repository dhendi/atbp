"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function LocalViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "map" ? "map" : "list";

  function setView(next: "list" | "map") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") params.delete("view");
    else params.set("view", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex shrink-0 rounded-full border border-ink-200 p-1">
      <button
        onClick={() => setView("list")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
          view === "list" ? "bg-ink-900 text-white" : "text-ink-500"
        )}
      >
        <List size={13} /> List
      </button>
      <button
        onClick={() => setView("map")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
          view === "map" ? "bg-ink-900 text-white" : "text-ink-500"
        )}
      >
        <MapIcon size={13} /> Map
      </button>
    </div>
  );
}
