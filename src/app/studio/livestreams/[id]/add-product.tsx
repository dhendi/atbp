"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addProductToStreamAction, type StreamProductInput } from "@/lib/actions/livestreams";

interface Product {
  id: string;
  title: string;
  sellingModes: string[];
}

export function AddProductToStream({ streamId, products }: { streamId: string; products: Product[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [mode, setMode] = useState<StreamProductInput["mode"]>("BUY_NOW");
  const [loading, setLoading] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId);

  async function handleAdd() {
    if (!productId) return toast.error("Select a product first.");
    setLoading(true);
    const res = await addProductToStreamAction(streamId, { productId, mode });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Added to queue!");
    setProductId("");
    router.refresh();
  }

  if (products.length === 0) {
    return (
      <div className="rounded-card border border-ink-100 bg-white p-4 text-sm text-ink-500">
        All your active products are already queued for this stream.
      </div>
    );
  }

  return (
    <div className="h-fit space-y-3 rounded-card border border-ink-100 bg-white p-4">
      <h2 className="font-bold text-ink-900">Add to Queue</h2>
      <Select value={productId} onValueChange={setProductId}>
        <SelectTrigger className="w-full"><SelectValue placeholder="Select product" /></SelectTrigger>
        <SelectContent>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedProduct && (
        <Select value={mode} onValueChange={(v) => setMode(v as StreamProductInput["mode"])}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {selectedProduct.sellingModes.map((m) => (
              <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button variant="brand" className="w-full" onClick={handleAdd} disabled={loading}>
        Add to Queue
      </Button>
    </div>
  );
}
