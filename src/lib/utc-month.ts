/** "YYYY-MM" in UTC — the bucket unit for any monthly cap tracked in this app. */
export function currentUtcMonth(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function previousUtcMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return currentUtcMonth(new Date(Date.UTC(y, m - 2, 1)));
}

export function utcMonthStart(month: string): Date {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1));
}

export function utcMonthEnd(month: string): Date {
  const start = utcMonthStart(month);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}
