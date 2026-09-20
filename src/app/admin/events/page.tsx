import { prisma } from "@/lib/prisma";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { Badge } from "@/components/ui/badge";
import { AddEventForm } from "./add-event-form";
import { EventStatusControls } from "./event-status-controls";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { eventDate: "desc" },
    include: { _count: { select: { sellers: true, interests: true } } },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Events</h1>

      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events yet" />
      ) : (
        <div className="mb-6 space-y-2">
          {events.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-2xl border border-ink-100 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{e.name}</p>
                <p className="text-xs text-ink-500">
                  {e.city} · {e.eventDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} · {e._count.sellers} sellers · {e._count.interests} interested
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={e.status === "UPCOMING" ? "brand" : e.status === "LIVE" ? "live" : "subtle"}>{e.status}</Badge>
                <EventStatusControls eventId={e.id} currentStatus={e.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-card border border-ink-100 bg-white p-4">
        <h2 className="mb-3 font-bold text-ink-900">Add an event</h2>
        <AddEventForm />
      </div>
    </div>
  );
}
