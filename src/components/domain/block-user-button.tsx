"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { blockUserAction, unblockUserAction } from "@/lib/actions/moderation";

export function BlockUserButton({
  userId, initiallyBlocked, label = true, onChange,
}: { userId: string; initiallyBlocked: boolean; label?: boolean; onChange?: (blocked: boolean) => void }) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = blocked ? await unblockUserAction(userId) : await blockUserAction(userId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      const next = !blocked;
      setBlocked(next);
      onChange?.(next);
      toast.success(blocked ? "User unblocked." : "User blocked. They can no longer message you.");
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant={blocked ? "outline" : "ghost"} disabled={pending} onClick={toggle}>
      {blocked ? <UserCheck size={14} /> : <UserX size={14} />}
      {label && (blocked ? "Unblock" : "Block")}
    </Button>
  );
}
