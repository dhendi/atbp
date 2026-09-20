"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { updateProductAction } from "@/lib/actions/products";

interface Product {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  quantityAvailable: number;
  status: string;
}

const STATUS_VARIANT: Record<string, "success" | "subtle" | "live" | "outline"> = {
  ACTIVE: "success",
  DRAFT: "outline",
  SOLD_OUT: "subtle",
  FLAGGED: "live",
};

export function InventoryRow({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(product.quantity);
  const [pending, startTransition] = useTransition();

  function handleUpdate(value: number) {
    setQuantity(value);
    startTransition(async () => {
      const res = await updateProductAction(product.id, { quantity: value });
      if (res && "error" in res) toast.error(res.error);
      else toast.success("Inventory updated");
    });
  }

  return (
    <tr className="border-b border-ink-50 last:border-0">
      <td className="px-4 py-3 font-semibold text-ink-800">{product.title}</td>
      <td className="px-4 py-3 text-ink-500">{product.sku ?? "N/A"}</td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min={product.quantity - product.quantityAvailable}
          value={quantity}
          disabled={pending}
          onChange={(e) => handleUpdate(Number(e.target.value))}
          className="h-8 w-20"
        />
      </td>
      <td className="px-4 py-3 text-ink-700">{product.quantityAvailable}</td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_VARIANT[product.status] ?? "outline"}>{product.status.replace("_", " ")}</Badge>
      </td>
    </tr>
  );
}
