"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { togglePromoCodeAction, deletePromoCodeAction } from "@/lib/actions/promo-codes";

export function PromoCodeActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await togglePromoCodeAction(id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Delete this promo code? This can't be undone.")) return;
    startTransition(async () => {
      const res = await deletePromoCodeAction(id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Promo code deleted");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant={active ? "subtle" : "brand"} disabled={pending} onClick={toggle}>
        {active ? "Deactivate" : "Activate"}
      </Button>
      <Button size="icon" variant="ghost" aria-label="Delete promo code" disabled={pending} onClick={remove}>
        <Trash2 size={15} />
      </Button>
    </div>
  );
}
