import Link from "next/link";
import Image from "next/image";
import { MapPin, Calendar } from "lucide-react";

export interface EventCardData {
  id: string;
  name: string;
  city: string;
  venue: string;
  coverImage: string;
  eventDate: string | Date;
  featured?: boolean;
}

export function EventCard({ event }: { event: EventCardData }) {
  const date = new Date(event.eventDate);
  return (
    <Link href={`/events/${event.id}`} className="relative block w-[260px] shrink-0 overflow-hidden rounded-card md:w-[300px]">
      <div className="relative aspect-[4/5]">
        <Image src={event.coverImage} alt={event.name} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/10 to-transparent" />
        {event.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-900">
            Featured
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-white/80">
          <MapPin size={11} /> {event.city}
        </p>
        <p className="font-display mt-1 text-lg font-semibold leading-tight">{event.name}</p>
        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-white/90">
          <Calendar size={11} /> {date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} · {event.venue}
        </p>
      </div>
    </Link>
  );
}
