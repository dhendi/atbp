"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moderateLivestreamAction } from "@/lib/actions/admin";

export function LivestreamModerationActions({ livestreamId, status }: { livestreamId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (status !== "LIVE" && status !== "SCHEDULED") return null;

  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await moderateLivestreamAction(livestreamId, "CANCELLED");
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          toast.success("Livestream cancelled");
          router.refresh();
        })
      }
    >
      Take Down
    </Button>
  );
}
