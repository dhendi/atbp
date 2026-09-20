import Link from "next/link";
import Image from "next/image";
import { Eye } from "lucide-react";
import { LiveBadge } from "@/components/domain/live-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCompactNumber, initials } from "@/lib/utils";

export interface LiveCardData {
  id: string;
  title: string;
  thumbnailUrl: string;
  viewerCount: number;
  category: string;
  seller: { shopName: string; handle: string; logoUrl?: string | null };
}

export function LiveCard({ stream, size = "default" }: { stream: LiveCardData; size?: "default" | "large" }) {
  return (
    <Link
      href={`/live/${stream.id}`}
      className={size === "large" ? "block w-full" : "block w-[168px] shrink-0 md:w-[200px]"}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-ink-900">
        <Image src={stream.thumbnailUrl} alt={stream.title} fill sizes="220px" className="object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" />

        <div className="absolute left-2.5 top-2.5 flex items-center justify-between right-2.5">
          <LiveBadge />
          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            <Eye size={11} /> {formatCompactNumber(stream.viewerCount)}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Avatar className="h-6 w-6 ring-2 ring-white/80">
              <AvatarImage src={stream.seller.logoUrl ?? undefined} />
              <AvatarFallback className="text-[10px]">{initials(stream.seller.shopName)}</AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-bold text-white">@{stream.seller.handle}</span>
          </div>
          <p className="line-clamp-2 text-sm font-extrabold leading-tight text-white">{stream.title}</p>
        </div>
      </div>
    </Link>
  );
}
