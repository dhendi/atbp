"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Square, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startLiveAction, endLiveAction, featureProductAction } from "@/lib/actions/livestreams";

export function ControlRoomActions({
  streamId, status, featureProductId, isLiveStreamActive,
}: { streamId: string; status: string; featureProductId?: string; isLiveStreamActive?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  if (featureProductId) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending || !isLiveStreamActive}
        onClick={() =>
          startTransition(async () => {
            const res = await featureProductAction(streamId, featureProductId);
            if ("error" in res) {
              toast.error(res.error);
              return;
            }
            toast.success("Now featuring this item!");
            router.refresh();
          })
        }
      >
        <Star size={13} /> Feature
      </Button>
    );
  }

  if (status === "SCHEDULED") {
    return (
      <Button
        variant="live"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await startLiveAction(streamId);
            if ("error" in res) {
              toast.error(res.error);
              return;
            }
            toast.success("You're live!");
            router.refresh();
          })
        }
      >
        <Play size={15} /> Start Live
      </Button>
    );
  }

  if (status === "LIVE") {
    return (
      <Button
        variant={confirmingEnd ? "destructive" : "outline"}
        disabled={pending}
        onClick={() => {
          if (!confirmingEnd) {
            setConfirmingEnd(true);
            return;
          }
          startTransition(async () => {
            const res = await endLiveAction(streamId);
            if ("error" in res) {
              toast.error(res.error);
              return;
            }
            toast.success("Stream ended");
            router.refresh();
          });
        }}
      >
        <Square size={14} /> {confirmingEnd ? "Confirm End" : "End Live"}
      </Button>
    );
  }

  return null;
}
