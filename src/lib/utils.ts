import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatCompactNumber(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatShortDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function addBusinessDays(date: Date, days: number) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) added++;
  }
  return result;
}

/** A real calendar date range, not a vague "N-M business days" — computed by
 * skipping weekends from a given start date (order date, or today for a
 * pre-purchase estimate on a product page). */
export function estimatedDeliveryRange(fromDate: Date | string, minBusinessDays: number, maxBusinessDays: number) {
  const start = addBusinessDays(new Date(fromDate), minBusinessDays);
  const end = addBusinessDays(new Date(fromDate), maxBusinessDays);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const month = start.toLocaleDateString("en-PH", { month: "short" });
    return `${month} ${start.getDate()}–${end.getDate()}`;
  }
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function genOrderNumber() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `ATBP-${rand}`;
}
