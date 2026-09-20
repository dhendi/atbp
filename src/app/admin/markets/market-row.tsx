"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toggleMarketActiveAction, deleteMarketAction } from "@/lib/actions/admin";

interface Market {
  id: string;
  name: string;
  city: string;
  active: boolean;
}

export function MarketRow({ market }: { market: Market }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-ink-100 bg-white p-3.5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-bold text-ink-900">
          {market.name} <Badge variant={market.active ? "success" : "subtle"}>{market.active ? "Active" : "Hidden"}</Badge>
        </p>
        <p className="text-xs text-ink-500">{market.city}</p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await toggleMarketActiveAction(market.id);
              if ("error" in res) toast.error(res.error);
              else router.refresh();
            })
          }
        >
          {market.active ? "Hide" : "Show"}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Delete market"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteMarketAction(market.id);
              if ("error" in res) toast.error(res.error);
              else { toast.success("Market removed"); router.refresh(); }
            })
          }
        >
          <Trash2 size={15} className="text-live-600" />
        </Button>
      </div>
    </div>
  );
}
