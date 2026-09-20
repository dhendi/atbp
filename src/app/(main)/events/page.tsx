import type { Metadata } from "next";
import { cachedQuery } from "@/lib/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CalendarDays } from "lucide-react";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { EventCard } from "@/components/domain/event-card";
import { getSelectedArea } from "@/lib/services/local";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Same for every visitor regardless of area — only the "near me" chip
// highlighting below depends on the area cookie, so it's read outside this cache.
const getEventsPageData = cachedQuery(
  async () => {
    const now = new Date();
    const [allUpcoming, past, featuredEventIds, cityRows] = await Promise.all([
      prisma.event.findMany({ where: { status: { in: ["UPCOMING", "LIVE"] } }, orderBy: { eventDate: "asc" } }),
      prisma.event.findMany({ where: { status: "ENDED" }, orderBy: { eventDate: "desc" }, take: 6 }),
      prisma.eventPromotion.findMany({ where: { status: "ACTIVE", startAt: { lte: now }, endAt: { gte: now } }, select: { eventId: true } }),
      prisma.event.findMany({ where: { status: { in: ["UPCOMING", "LIVE"] } }, distinct: ["city"], select: { city: true } }),
    ]);
    return { allUpcoming, past, featuredEventIds, cityRows };
  },
  ["events-page-data"],
  { revalidate: 60, tags: ["events"] }
);

const EVENTS_TITLE = "Events";
const EVENTS_DESCRIPTION =
  "Find flea markets, card shows, and maker fairs from the ATBP community. Browse upcoming events by city, or see what already happened.";

export const metadata: Metadata = {
  title: EVENTS_TITLE,
  description: EVENTS_DESCRIPTION,
  openGraph: { title: EVENTS_TITLE, description: EVENTS_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: EVENTS_TITLE, description: EVENTS_DESCRIPTION },
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const { city } = await searchParams;
  const myArea = await getSelectedArea();

  const { allUpcoming, past, featuredEventIds, cityRows } = await getEventsPageData();
  const featuredSet = new Set(featuredEventIds.map((f) => f.eventId));
  const cities = cityRows.map((c) => c.city).sort();
  const upcoming = city ? allUpcoming.filter((e) => e.city === city) : allUpcoming;

  return (
    <div className="space-y-8 pt-4 md:pt-6">
      <SectionHeader eyebrow="IRL" title="Events" subtitle="Flea markets, card shows, and maker fairs from the ATBP community" />

      {cities.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 md:px-6">
          <Link href="/events" className={cn("shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold", !city ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600")}>
            All areas
          </Link>
          {myArea && cities.includes(myArea) && (
            <Link href={`/events?city=${encodeURIComponent(myArea)}`} className={cn("shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold", city === myArea ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600")}>
              📍 Near me ({myArea})
            </Link>
          )}
          {cities.filter((c) => c !== myArea).map((c) => (
            <Link key={c} href={`/events?city=${encodeURIComponent(c)}`} className={cn("shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold", city === c ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 text-ink-600")}>
              {c}
            </Link>
          ))}
        </div>
      )}

      {upcoming.length === 0 ? (
        <div className="px-4 md:px-6">
          <EmptyState icon={CalendarDays} title={city ? `No upcoming events in ${city}` : "No upcoming events"} description="Check back soon, or follow a seller to hear about ones they're joining." />
        </div>
      ) : (
        <section className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={{ id: e.id, name: e.name, city: e.city, venue: e.venue, coverImage: e.coverImage, eventDate: e.eventDate, featured: featuredSet.has(e.id) }} />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 px-4 font-bold text-ink-900 md:px-6">Past events</h2>
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {past.map((e) => (
              <EventCard key={e.id} event={{ id: e.id, name: e.name, city: e.city, venue: e.venue, coverImage: e.coverImage, eventDate: e.eventDate }} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
