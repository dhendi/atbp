"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleSaveProductAction } from "@/lib/actions/social";

export function SaveButton({ productId, initiallySaved, label }: { productId: string; initiallySaved: boolean; label?: string }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await toggleSaveProductAction(productId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setSaved(!!res.saved);
    });
  }

  return (
    <Button variant={saved ? "subtle" : "outline"} size="sm" disabled={pending} onClick={toggle}>
      <Heart size={14} className={saved ? "fill-live-500 text-live-500" : ""} /> {label ?? (saved ? "Saved" : "Save")}
    </Button>
  );
}
