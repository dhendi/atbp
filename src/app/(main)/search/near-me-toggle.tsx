"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function NearMeToggle({ area }: { area: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("near") === "1";

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (active) params.delete("near");
    else params.set("near", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold",
        active ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600"
      )}
    >
      <MapPin size={13} /> Near me ({area})
    </button>
  );
}
