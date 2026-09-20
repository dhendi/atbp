"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteThreadAction } from "@/lib/actions/social";

export function DeleteThreadButton({ threadId, otherName }: { threadId: string; otherName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete this entire conversation with ${otherName}? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deleteThreadAction(threadId);
      if (res && "error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Conversation deleted");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      aria-label="Delete conversation"
      title="Delete conversation"
      disabled={pending}
      onClick={handleDelete}
      className="shrink-0 rounded-full p-2 text-ink-300 hover:bg-ink-100 hover:text-live-600"
    >
      <Trash2 size={15} />
    </button>
  );
}
