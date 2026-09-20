"use client";

import { cn } from "@/lib/utils";
import type { ShopHoursInput } from "@/lib/actions/local";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function defaultHours(): ShopHoursInput[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    opensAt: "09:00",
    closesAt: "18:00",
    closed: dayOfWeek === 0,
    open24h: false,
    byAppointment: false,
  }));
}

export function ShopHoursEditor({ hours, onChange }: { hours: ShopHoursInput[]; onChange: (hours: ShopHoursInput[]) => void }) {
  function updateDay(dayOfWeek: number, patch: Partial<ShopHoursInput>) {
    onChange(hours.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h)));
  }

  return (
    <div className="space-y-2">
      {hours.map((h) => (
        <div key={h.dayOfWeek} className="flex flex-wrap items-center gap-2">
          <span className="w-9 text-xs font-semibold text-ink-600">{DAYS[h.dayOfWeek]}</span>
          <button
            type="button"
            onClick={() => updateDay(h.dayOfWeek, { closed: !h.closed })}
            className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", h.closed ? "bg-ink-100 text-ink-500" : "bg-brand-50 text-brand-700")}
          >
            {h.closed ? "Closed" : "Open"}
          </button>
          {!h.closed && (
            <>
              <button
                type="button"
                onClick={() => updateDay(h.dayOfWeek, { open24h: !h.open24h })}
                className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", h.open24h ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-500")}
              >
                24 hrs
              </button>
              <button
                type="button"
                onClick={() => updateDay(h.dayOfWeek, { byAppointment: !h.byAppointment })}
                className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", h.byAppointment ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-500")}
              >
                By appointment
              </button>
              {!h.open24h && !h.byAppointment && (
                <>
                  <input
                    type="time"
                    value={h.opensAt ?? "09:00"}
                    onChange={(e) => updateDay(h.dayOfWeek, { opensAt: e.target.value })}
                    className="h-8 rounded-lg border border-ink-200 px-2 text-xs"
                  />
                  <span className="text-xs text-ink-400">to</span>
                  <input
                    type="time"
                    value={h.closesAt ?? "18:00"}
                    onChange={(e) => updateDay(h.dayOfWeek, { closesAt: e.target.value })}
                    className="h-8 rounded-lg border border-ink-200 px-2 text-xs"
                  />
                </>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
