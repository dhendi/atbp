"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  if (ms <= 0) return "00:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Countdown({ target, onExpire, className }: { target: string | Date; className?: string; onExpire?: () => void }) {
  const targetTime = new Date(target).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (targetTime - now <= 0) onExpire?.();
  }, [now, targetTime, onExpire]);

  return <span className={className}>{format(targetTime - now)}</span>;
}

/** Compact "time remaining" label for auction cards/badges, e.g. "2h 14m left" or "Ended". Updates every ~30s — fine for a badge, not meant for split-second precision. */
export function MiniCountdown({ target, onExpire }: { target: string | Date; onExpire?: () => void }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Ended");
        onExpire?.();
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      if (days > 0) setLabel(`${days}d ${hours}h left`);
      else if (hours > 0) setLabel(`${hours}h ${minutes}m left`);
      else if (minutes > 0) setLabel(`${minutes}m left`);
      else setLabel("<1m left");
    }
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return <>{label}</>;
}

export function DateCountdownLabel({ target, onExpire }: { target: string | Date; onExpire?: () => void }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Starting now");
        onExpire?.();
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      if (days > 0) setLabel(`in ${days}d ${hours}h`);
      else if (hours > 0) setLabel(`in ${hours}h ${minutes}m`);
      else setLabel(`in ${minutes}m`);
    }
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
    // Same deliberate omission as MiniCountdown above — onExpire is often an
    // inline callback from the caller, and including it would tear down and
    // restart this interval on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return <>{label}</>;
}
