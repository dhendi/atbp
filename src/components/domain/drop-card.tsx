"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Package, Bell } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DateCountdownLabel } from "@/components/domain/countdown";
import { toggleDropReminderAction } from "@/lib/actions/drops";

export interface DropCardData {
  id: string;
  name: string;
  coverImage: string;
  releaseAt: string;
  seller: { shopName: string; handle: string };
  quantityAvailable: number;
}

export function DropCard({ drop, isReminded, loggedIn }: { drop: DropCardData; isReminded?: boolean; loggedIn?: boolean }) {
  const router = useRouter();
  const [reminded, setReminded] = useState(!!isReminded);
  const [pending, startTransition] = useTransition();

  function handleRemind(e: React.MouseEvent) {
    e.preventDefault();
    if (!loggedIn) {
      router.push(`/login?callbackUrl=/drops/${drop.id}`);
      return;
    }
    startTransition(async () => {
      const res = await toggleDropReminderAction(drop.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setReminded(!!res.reminded);
      if (res.reminded) toast.success("We'll let you know when it goes live.");
    });
  }

  return (
    <div className="group relative block w-[210px] shrink-0 md:w-[240px]">
      {isReminded !== undefined && (
        <button
          onClick={handleRemind}
          disabled={pending}
          aria-label={reminded ? "Cancel reminder" : "Remind me"}
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
        >
          <Bell size={14} className={reminded ? "fill-gold-400 text-gold-400" : ""} />
        </button>
      )}
      <Link href={`/drops/${drop.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-ink-100">
          <Image src={drop.coverImage} alt={drop.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-transparent to-transparent" />
          <div className="price-tag absolute left-2.5 top-2.5 bg-white/95 px-2.5 py-1">
            <span className="font-tag text-[11px] font-bold text-ink-900">
              Drops <DateCountdownLabel target={drop.releaseAt} />
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3 text-white">
            <p className="font-display text-base font-semibold leading-tight">{drop.name}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/80">
              {drop.seller.shopName} · <Package size={11} /> {drop.quantityAvailable} available
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
