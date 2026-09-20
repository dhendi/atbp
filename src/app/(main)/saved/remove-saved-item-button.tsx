"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { toggleSaveProductAction } from "@/lib/actions/social";

export function RemoveSavedItemButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="Remove from saved"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await toggleSaveProductAction(productId);
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          router.refresh();
        })
      }
      className="flex items-center gap-1 rounded-full border border-ink-200 px-2.5 py-1 text-[11px] font-semibold text-ink-500 hover:bg-ink-100"
    >
      <X size={11} /> Remove
    </button>
  );
}
