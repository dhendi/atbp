"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickItemForm, type QuickItemCategoryOption } from "@/components/domain/quick-item-form";
import { TawadSettingsDialog } from "@/components/domain/tawad-settings-dialog";
import { conditionLabel } from "@/lib/constants";
import { formatPeso } from "@/lib/utils";
import { createClosetItemAction, confirmClosetItemAvailableAction, removeClosetItemAction } from "@/lib/actions/closet";

interface ClosetItem {
  id: string;
  title: string;
  images: string[];
  price: number;
  condition: string;
  status: string;
  closetConfirmedAt: string | null;
  staleNudgeSentAt: string | null;
  tawadEnabled: boolean;
  tawadFloor: number | null;
  tawadCeiling: number | null;
}

const STATUS_VARIANT: Record<string, "success" | "subtle" | "live" | "outline"> = {
  ACTIVE: "success",
  PAUSED_CAP: "live",
  SOLD_OUT: "subtle",
};

export function ClosetItemsPanel({
  items, categories, defaultCity,
}: { items: ClosetItem[]; categories: QuickItemCategoryOption[]; defaultCity: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirm(productId: string) {
    startTransition(async () => {
      const res = await confirmClosetItemAvailableAction(productId);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Confirmed, still listed");
      router.refresh();
    });
  }

  function remove(productId: string) {
    startTransition(async () => {
      const res = await removeClosetItemAction(productId);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Removed from your Closet");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <QuickItemForm
        categories={categories}
        defaultCity={defaultCity}
        submitLabel="Add to My Closet"
        onSubmit={(values) => createClosetItemAction(values)}
        onSuccess={() => router.refresh()}
      />

      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-400">My closet items</p>
          {items.map((item) => {
            const stale = !!item.staleNudgeSentAt && item.status === "ACTIVE";
            return (
              <div
                key={item.id}
                className={`flex flex-col gap-3 rounded-card border p-3 sm:flex-row sm:items-center ${stale ? "border-gold-300 bg-gold-50" : "border-ink-100 bg-white"}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                    {item.images[0] && <Image src={item.images[0]} alt={item.title} fill className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{item.title}</p>
                    <p className="text-xs text-ink-500">{conditionLabel(item.condition)} · {formatPeso(item.price)}</p>
                    {stale && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-gold-700">
                        <Clock size={11} /> Still have this? Listed 90+ days ago.
                      </p>
                    )}
                  </div>
                  {/* ACTIVE is the expected default for every item under "My closet items" — only worth a badge when it's an exception (sold out, paused). */}
                  {item.status !== "ACTIVE" && <Badge variant={STATUS_VARIANT[item.status] ?? "outline"}>{item.status.replace("_", " ")}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stale && <Button size="sm" variant="brand" disabled={pending} onClick={() => confirm(item.id)}>Still have it</Button>}
                  <TawadSettingsDialog productId={item.id} tawadEnabled={item.tawadEnabled} tawadFloor={item.tawadFloor} tawadCeiling={item.tawadCeiling} />
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => remove(item.id)}>Remove</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
