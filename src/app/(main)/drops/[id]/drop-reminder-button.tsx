"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleDropReminderAction } from "@/lib/actions/drops";

export function DropReminderButton({ dropId, isReminded: initial, loggedIn }: { dropId: string; isReminded: boolean; loggedIn: boolean }) {
  const router = useRouter();
  const [reminded, setReminded] = useState(initial);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!loggedIn) {
      router.push(`/login?callbackUrl=/drops/${dropId}`);
      return;
    }
    startTransition(async () => {
      const res = await toggleDropReminderAction(dropId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setReminded(!!res.reminded);
      toast.success(res.reminded ? "We'll let you know when it goes live." : "Reminder cancelled.");
    });
  }

  return (
    <Button size="sm" variant={reminded ? "subtle" : "outline"} disabled={pending} onClick={handleClick}>
      <Bell size={14} className={reminded ? "fill-gold-500 text-gold-500" : ""} /> {reminded ? "Reminder set" : "Remind me"}
    </Button>
  );
}
