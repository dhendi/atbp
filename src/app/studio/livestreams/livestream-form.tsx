"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn, formatPeso } from "@/lib/utils";
import { createLivestreamAction, type StreamProductInput } from "@/lib/actions/livestreams";

interface Product {
  id: string;
  title: string;
  price: number;
  sellingModes: string[];
  images: string[];
}

export function LivestreamForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 3600000);
    return d.toISOString().slice(0, 16);
  });
  const [selected, setSelected] = useState<Record<string, StreamProductInput>>({});
  const [loading, setLoading] = useState(false);

  function toggleProduct(p: Product) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = { productId: p.id, mode: (p.sellingModes[0] as StreamProductInput["mode"]) ?? "BUY_NOW" };
      return next;
    });
  }

  function setMode(productId: string, mode: StreamProductInput["mode"]) {
    setSelected((prev) => ({ ...prev, [productId]: { ...prev[productId], mode } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(selected).length === 0) return toast.error("Select at least one product to feature.");
    setLoading(true);
    const res = await createLivestreamAction({
      title, description, category, thumbnailUrl,
      scheduledAt: new Date(scheduledAt).toISOString(),
      products: Object.values(selected),
    });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Livestream scheduled!");
    router.push(`/studio/livestreams/${res.streamId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="space-y-1.5">
        <Label>Stream title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="SNEAKER STEALS 🔥 Grail Hunt Live" required />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="sneakers" required />
        </div>
        <div className="space-y-1.5">
          <Label>Scheduled date & time</Label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Thumbnail URL</Label>
        <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div className="space-y-2">
        <Label>Feature products</Label>
        <div className="space-y-2">
          {products.map((p) => {
            const isSelected = !!selected[p.id];
            return (
              <div key={p.id} className={cn("rounded-2xl border p-3", isSelected ? "border-brand-500 bg-brand-50" : "border-ink-200")}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleProduct(p)} className="h-4 w-4 accent-brand-500" />
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                    <Image src={p.images[0]} alt={p.title} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{p.title}</p>
                    <p className="text-xs text-ink-500">{formatPeso(p.price)}</p>
                  </div>
                </label>
                {isSelected && (
                  <div className="mt-2 flex gap-1.5 pl-7">
                    {p.sellingModes.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setMode(p.id, m as StreamProductInput["mode"])}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-bold",
                          selected[p.id]?.mode === m ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-500"
                        )}
                      >
                        {m.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Button type="submit" variant="brand" size="lg" disabled={loading}>
        {loading ? "Scheduling..." : "Schedule Livestream"}
      </Button>
    </form>
  );
}
