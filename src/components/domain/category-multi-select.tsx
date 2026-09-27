"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  slug: string;
  name: string;
  icon: string;
}

const MAX_SUGGESTIONS = 8;

/** The "what do you primarily sell?" picker shared by seller onboarding
 * (Shop, Closet, Yard Sale) and Studio > Shop Settings — a type-ahead search
 * over the full category list (90+ options) instead of a wall of chips, plus
 * a freeform "Other" fallback that goes to admin review rather than blocking
 * submission. */
export function CategoryMultiSelect({
  categories, selected, onSelectedChange, customTags, onCustomTagsChange,
}: {
  categories: CategoryOption[];
  selected: string[];
  onSelectedChange: (slugs: string[]) => void;
  customTags: string[];
  onCustomTagsChange: (tags: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selectedCategories = useMemo(
    () => selected.map((slug) => categories.find((c) => c.slug === slug)).filter((c): c is CategoryOption => !!c),
    [selected, categories]
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = categories.filter((c) => !selected.includes(c.slug));
    // Empty query = "browse all" (the whole point of showing a dropdown on
    // focus is for someone who doesn't know what the choices are), so it
    // isn't capped to MAX_SUGGESTIONS the way a typed search is — the list
    // just scrolls instead.
    if (!q) return [...available].sort((a, b) => a.name.localeCompare(b.name));
    return available.filter((c) => c.name.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [query, categories, selected]);

  const exactMatch = categories.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  function selectCategory(slug: string) {
    onSelectedChange([...selected, slug]);
    setQuery("");
  }

  function removeCategory(slug: string) {
    onSelectedChange(selected.filter((s) => s !== slug));
  }

  function addCustomTag() {
    const tag = query.trim();
    if (!tag || exactMatch) return;
    if (!customTags.includes(tag)) onCustomTagsChange([...customTags, tag]);
    setQuery("");
  }

  function removeCustomTag(tag: string) {
    onCustomTagsChange(customTags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (suggestions.length > 0) selectCategory(suggestions[0].slug);
    else addCustomTag();
  }

  const showDropdown = isOpen && (query.trim().length > 0 || suggestions.length > 0);

  return (
    <div className="space-y-1.5">
      <Label>What do you primarily sell?</Label>
      <p className="text-xs text-ink-500">Tap the field to browse all options, or type to search. Pick as many as apply. This powers search and discovery, it doesn&apos;t limit what you can actually list.</p>

      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            clearTimeout(blurTimeout.current);
            setIsOpen(true);
          }}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setIsOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Handmade, Vintage, Cookies..."
        />
        {showDropdown && (
          <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-ink-200 bg-white shadow-lg">
            {suggestions.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => selectCategory(c.slug)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-ink-700 hover:bg-ink-50"
              >
                <span>{c.icon}</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
            {query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={addCustomTag}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-gold-700 hover:bg-gold-50",
                  suggestions.length > 0 && "border-t border-ink-100"
                )}
              >
                Add &ldquo;{query.trim()}&rdquo; as your own tag
              </button>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-ink-400">Don&apos;t see what you sell? Type it anyway and add it as your own tag. It goes to our team for review.</p>

      {(selectedCategories.length > 0 || customTags.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedCategories.map((c) => (
            <span key={c.slug} className="flex items-center gap-1 rounded-full border border-brand-500 bg-brand-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-brand-700">
              <span>{c.icon}</span> {c.name}
              <button
                type="button"
                onClick={() => removeCategory(c.slug)}
                aria-label={`Remove ${c.name}`}
                className="rounded-full p-0.5 hover:bg-brand-100"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {customTags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-full bg-gold-100 py-1 pl-3 pr-1.5 text-xs font-semibold text-gold-700">
              {tag}
              <button
                type="button"
                onClick={() => removeCustomTag(tag)}
                aria-label={`Remove ${tag}`}
                className="rounded-full p-0.5 hover:bg-gold-200"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
