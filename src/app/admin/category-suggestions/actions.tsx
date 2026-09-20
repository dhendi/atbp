"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reviewCategoryTagSuggestionAction, approveAndCreateCategoryFromSuggestionAction } from "@/lib/actions/admin";

function titleCase(tag: string) {
  return tag.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CategoryTagSuggestionActions({ suggestionId, tag }: { suggestionId: string; tag: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(titleCase(tag));
  const [icon, setIcon] = useState("");

  function apply(status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const res = await reviewCategoryTagSuggestionAction(suggestionId, status);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(status === "APPROVED" ? "Marked as promotable" : "Rejected");
      router.refresh();
    });
  }

  function createCategory() {
    if (!icon.trim()) { toast.error("Pick an icon."); return; }
    startTransition(async () => {
      const res = await approveAndCreateCategoryFromSuggestionAction(suggestionId, name, icon);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Category "${res.category.name}" created`);
      setCreating(false);
      router.refresh();
    });
  }

  if (creating) {
    return (
      <div className="flex items-center gap-1.5">
        <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🏷️" className="h-8 w-14 text-center" maxLength={2} />
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-40" />
        <Button size="sm" variant="brand" disabled={pending} onClick={createCategory}>Create</Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setCreating(false)}>Cancel</Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="brand" disabled={pending} onClick={() => setCreating(true)}>Approve &amp; Create Category</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("APPROVED")}>Approve only</Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => apply("REJECTED")}>Reject</Button>
    </div>
  );
}
