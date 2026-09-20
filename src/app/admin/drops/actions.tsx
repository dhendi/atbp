"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelDropAction } from "@/lib/actions/admin";

export function DropRowActions({ dropId }: { dropId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await cancelDropAction(dropId);
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          toast.success("Drop ended");
          router.refresh();
        })
      }
    >
      End drop
    </Button>
  );
}
