"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { suspendUserAction } from "@/lib/actions/admin";

export function UserModerationActions({ userId, suspended }: { userId: string; suspended: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={suspended ? "outline" : "destructive"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await suspendUserAction(userId, !suspended);
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          toast.success(suspended ? "User reinstated" : "User suspended");
          router.refresh();
        })
      }
    >
      {suspended ? "Reinstate" : "Suspend"}
    </Button>
  );
}
