"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleEventInterestAction } from "@/lib/actions/events";

export function EventInterestButtons({
  eventId, loggedIn, initialInterested, initialSaved, interestedCount, savedCount,
}: { eventId: string; loggedIn: boolean; initialInterested: boolean; initialSaved: boolean; interestedCount: number; savedCount: number }) {
  const router = useRouter();
  const [interested, setInterested] = useState(initialInterested);
  const [saved, setSaved] = useState(initialSaved);
  const [counts, setCounts] = useState({ interested: interestedCount, saved: savedCount });
  const [pending, startTransition] = useTransition();

  function toggle(type: "INTERESTED" | "SAVED") {
    if (!loggedIn) {
      router.push(`/login?callbackUrl=/events/${eventId}`);
      return;
    }
    startTransition(async () => {
      const res = await toggleEventInterestAction(eventId, type);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      if (type === "INTERESTED") {
        setInterested(!!res.active);
        setCounts((c) => ({ ...c, interested: c.interested + (res.active ? 1 : -1) }));
      } else {
        setSaved(!!res.active);
        setCounts((c) => ({ ...c, saved: c.saved + (res.active ? 1 : -1) }));
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={interested ? "brand" : "outline"} size="sm" onClick={() => toggle("INTERESTED")} disabled={pending}>
        <Star size={14} className={interested ? "fill-white" : ""} /> Interested{counts.interested > 0 ? ` (${counts.interested})` : ""}
      </Button>
      <Button variant={saved ? "subtle" : "outline"} size="sm" onClick={() => toggle("SAVED")} disabled={pending}>
        <Heart size={14} className={saved ? "fill-live-500 text-live-500" : ""} /> Save{counts.saved > 0 ? ` (${counts.saved})` : ""}
      </Button>
    </div>
  );
}
