"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Calendar, Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleReminderAction } from "@/lib/actions/live";
import { toast } from "sonner";

export interface UpcomingLiveData {
  id: string;
  title: string;
  thumbnailUrl: string;
  scheduledAt: string;
  category: string;
  hasReminder: boolean;
  reminderCount: number;
  seller: { shopName: string; handle: string };
}

export function UpcomingLiveCard({ stream }: { stream: UpcomingLiveData }) {
  const [hasReminder, setHasReminder] = useState(stream.hasReminder);
  const [pending, startTransition] = useTransition();

  const date = new Date(stream.scheduledAt);
  const dateLabel = date.toLocaleString("en-PH", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="w-[240px] shrink-0 rounded-card border border-ink-100 bg-white p-3 md:w-[260px]">
      <div className="relative mb-3 aspect-video overflow-hidden rounded-2xl bg-ink-100">
        <Image src={stream.thumbnailUrl} alt={stream.title} fill sizes="260px" className="object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-700">
          {stream.category}
        </span>
      </div>
      <p className="truncate text-xs font-semibold text-ink-500">@{stream.seller.handle}</p>
      <p className="mb-1.5 line-clamp-2 text-sm font-bold text-ink-900">{stream.title}</p>
      <div className="mb-3 flex items-center gap-1.5 text-xs text-ink-500">
        <Calendar size={13} /> {dateLabel}
      </div>
      <Button
        size="sm"
        variant={hasReminder ? "brand" : "outline"}
        disabled={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            const res = await toggleReminderAction(stream.id);
            if ("error" in res) {
              toast.error(res.error);
              return;
            }
            setHasReminder(!!res.reminder);
            toast.success(res.reminder ? "Reminder set!" : "Reminder removed");
          })
        }
      >
        {hasReminder ? <BellRing size={14} /> : <Bell size={14} />}
        {hasReminder ? "Reminder set" : "Set Reminder"}
      </Button>
    </div>
  );
}
