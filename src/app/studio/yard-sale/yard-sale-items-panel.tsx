"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickItemForm, type QuickItemCategoryOption } from "@/components/domain/quick-item-form";
import { TawadSettingsDialog } from "@/components/domain/tawad-settings-dialog";
import { conditionLabel } from "@/lib/constants";
import { formatPeso } from "@/lib/utils";
import { createYardSaleItemAction, removeYardSaleItemAction, closeYardSaleEarlyAction } from "@/lib/actions/yard-sale";

interface YardSaleItem {
  id: string;
  title: string;
  images: string[];
  price: number;
  condition: string;
  status: string;
  tawadEnabled: boolean;
  tawadFloor: number | null;
  tawadCeiling: number | null;
}

const STATUS_VARIANT: Record<string, "success" | "subtle" | "live" | "outline"> = {
  ACTIVE: "success",
  SOLD_OUT: "subtle",
};

export function YardSaleItemsPanel({
  yardSaleId, items, categories, defaultCity,
}: { yardSaleId: string; items: YardSaleItem[]; categories: QuickItemCategoryOption[]; defaultCity: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingClose, setConfirmingClose] = useState(false);

  function remove(productId: string) {
    startTransition(async () => {
      const res = await removeYardSaleItemAction(productId);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Removed from your Yard Sale");
      router.refresh();
    });
  }

  function closeEarly() {
    startTransition(async () => {
      const res = await closeYardSaleEarlyAction(yardSaleId);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setConfirmingClose(false);
      toast.success("Yard Sale closed");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <QuickItemForm
        categories={categories}
        defaultCity={defaultCity}
        submitLabel="Add to My Yard Sale"
        onSubmit={(values) => createYardSaleItemAction(values)}
        onSuccess={() => router.refresh()}
      />

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-card border border-ink-100 bg-white p-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                  {item.images[0] && <Image src={item.images[0]} alt={item.title} fill className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{item.title}</p>
                  <p className="text-xs text-ink-500">{conditionLabel(item.condition)} · {formatPeso(item.price)}</p>
                </div>
                <Badge variant={STATUS_VARIANT[item.status] ?? "outline"}>{item.status.replace("_", " ")}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <TawadSettingsDialog productId={item.id} tawadEnabled={item.tawadEnabled} tawadFloor={item.tawadFloor} tawadCeiling={item.tawadCeiling} />
                <Button size="sm" variant="outline" disabled={pending} onClick={() => remove(item.id)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmingClose ? (
        <div className="space-y-2 rounded-card border border-live-200 bg-live-50 p-3">
          <p className="text-xs text-ink-700">Close this Yard Sale now? Its remaining items will be archived and you can start a new one right away.</p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" disabled={pending} onClick={closeEarly}>{pending ? "Closing..." : "Yes, close it"}</Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setConfirmingClose(false)}>Keep it open</Button>
          </div>
        </div>
      ) : (
        <Button variant="destructive" size="sm" disabled={pending} onClick={() => setConfirmingClose(true)}>Close Yard Sale early</Button>
      )}
    </div>
  );
}
