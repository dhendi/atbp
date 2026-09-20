"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ONBOARDING_INTERESTS, getInterest } from "@/lib/interests";
import { updateUserInterestsAction } from "@/lib/actions/preferences";

const DISMISS_KEY = "atbp_interests_dismissed";

export function InterestsOnboarding() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  function toggle(slug: string) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function handleSave() {
    setSaving(true);
    const res = await updateUserInterestsAction(selected);
    setSaving(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Thanks! We'll use this to shape what you see.");
    dismiss();
  }

  return (
    <div className="relative mb-6 rounded-card border border-brand-200 bg-brand-50 p-4">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 text-ink-400 hover:text-ink-700">
        <X size={16} />
      </button>
      <p className="font-display text-base font-semibold text-ink-900">What are you into?</p>
      <p className="mt-0.5 text-xs text-ink-500">Pick a few things you like (totally optional). It helps us show you better finds.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ONBOARDING_INTERESTS.map((slug) => {
          const interest = getInterest(slug);
          const active = selected.includes(slug);
          return (
            <button
              key={slug}
              type="button"
              onClick={() => toggle(slug)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                active ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 bg-white text-ink-600"
              )}
            >
              {interest.emoji} {interest.label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="brand" disabled={saving || selected.length === 0} onClick={handleSave}>
          {saving ? "Saving..." : "Save my interests"}
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>Maybe later</Button>
      </div>
    </div>
  );
}
