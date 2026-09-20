"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryMultiSelect, type CategoryOption } from "@/components/domain/category-multi-select";
import { updatePrimaryCategoriesAction } from "@/lib/actions/social";

export function PrimaryCategoriesForm({ categories, initial }: { categories: CategoryOption[]; initial: string[] }) {
  const [primaryCategories, setPrimaryCategories] = useState<string[]>(initial);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (primaryCategories.length === 0 && customTags.length === 0) {
      return toast.error("Please choose at least one category for what you primarily sell.");
    }
    setLoading(true);
    const res = await updatePrimaryCategoriesAction({ primaryCategories, customCategoryTags: customTags });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    setCustomTags([]);
    toast.success("Primary categories saved");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl border border-ink-200 p-4">
      <div className="flex items-center gap-2">
        <Tag size={16} className="text-brand-600" />
        <p className="text-sm font-bold text-ink-900">Categories</p>
      </div>

      <CategoryMultiSelect
        categories={categories}
        selected={primaryCategories}
        onSelectedChange={setPrimaryCategories}
        customTags={customTags}
        onCustomTagsChange={setCustomTags}
      />

      <Button type="submit" variant="brand" size="sm" disabled={loading}>
        {loading ? "Saving..." : "Save Categories"}
      </Button>
    </form>
  );
}
