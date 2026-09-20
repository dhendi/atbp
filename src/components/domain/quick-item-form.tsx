"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickItemPhotoUploader } from "@/components/domain/quick-item-photo-uploader";
import { cn } from "@/lib/utils";
import { CONDITIONS, conditionDefinition, type Condition } from "@/lib/constants";

export interface QuickItemCategoryOption {
  id: string;
  name: string;
  icon: string;
}

// Same CONDITIONS list and labels as the full listing form (My Shop) — the
// quick flow used to have its own hardcoded 4-option list with different
// wording ("New" instead of "Brand New") and no Excellent option, which meant
// "Good" or "Excellent" could mean different things depending on which form a
// seller happened to use. Kept to all 5 grades for consistency.
const QUICK_CONDITIONS = CONDITIONS;

export interface QuickItemValues {
  images: string[];
  categoryId: string;
  condition: Condition;
  price: number;
  city?: string;
}

/** The shared "as fast as possible" quick-list flow behind both My Closet
 * and My Yard Sale: photos, what is it, condition, price, location, list it.
 * No title field, no AI suggestions — deliberately minimal per spec. */
export function QuickItemForm({
  categories, defaultCity, submitLabel, onSubmit, onSuccess,
}: {
  categories: QuickItemCategoryOption[];
  defaultCity: string;
  submitLabel: string;
  onSubmit: (values: QuickItemValues) => Promise<{ error?: string; warning?: string | null }>;
  onSuccess: () => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState<QuickItemValues["condition"]>("GOOD");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (images.length === 0) return toast.error("Add at least one photo.");
    if (!categoryId) return toast.error("Choose what it is.");
    if (!price || Number(price) <= 0) return toast.error("Set a price.");

    setLoading(true);
    const res = await onSubmit({ images, categoryId, condition, price: Number(price), city });
    setLoading(false);
    if (res.error) return toast.error(res.error);
    if (res.warning) toast(res.warning, { icon: "💡" });
    toast.success("Listed!");
    setImages([]);
    setCategoryId("");
    setCondition("GOOD");
    setPrice("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-ink-100 bg-white p-4">
      <div className="space-y-1.5">
        <Label>Photos</Label>
        <QuickItemPhotoUploader value={images} onChange={setImages} />
      </div>

      <div className="space-y-1.5">
        <Label>What is it?</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose a category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Condition</Label>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              title={c.definition}
              className={cn(
                "rounded-xl border py-2 text-center text-xs font-semibold transition-colors",
                condition === c.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-400">{conditionDefinition(condition)}</p>
      </div>

      <div className="space-y-1.5">
        <Label>Price (₱)</Label>
        <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <Label>Location</Label>
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / area" />
      </div>

      <Button type="submit" variant="brand" className="w-full" disabled={loading}>
        {loading ? "Listing..." : submitLabel}
      </Button>
    </form>
  );
}
