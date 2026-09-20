"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { removeCollectionItemAction } from "@/lib/actions/collections";

export function RemoveItemButton({ collectionId, itemId }: { collectionId: string; itemId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      aria-label="Remove from collection"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await removeCollectionItemAction(collectionId, itemId);
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          router.refresh();
        });
      }}
      className="absolute left-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
    >
      <X size={14} />
    </button>
  );
}
