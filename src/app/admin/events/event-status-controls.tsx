"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateEventStatusAction } from "@/lib/actions/events";

export function EventStatusControls({ eventId, currentStatus }: { eventId: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();

  function handleChange(status: "UPCOMING" | "LIVE" | "ENDED" | "CANCELLED") {
    startTransition(async () => {
      const res = await updateEventStatusAction(eventId, status);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Status updated.");
    });
  }

  return (
    <select
      value={currentStatus}
      onChange={(e) => handleChange(e.target.value as "UPCOMING" | "LIVE" | "ENDED" | "CANCELLED")}
      disabled={pending}
      className="h-8 rounded-lg border border-ink-200 px-2 text-xs"
    >
      <option value="UPCOMING">Upcoming</option>
      <option value="LIVE">Live</option>
      <option value="ENDED">Ended</option>
      <option value="CANCELLED">Cancelled</option>
    </select>
  );
}
