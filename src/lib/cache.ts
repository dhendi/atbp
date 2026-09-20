import { unstable_cache } from "next/cache";

// unstable_cache round-trips its return value through JSON to persist it in
// Next's Data Cache — which silently turns every Prisma `Date` field into an
// ISO string. Downstream code that calls `.getFullYear()`/`.toLocaleDateString()`/
// etc. on what it thinks is still a Date then throws ("x.getFullYear is not a
// function"). This wrapper revives ISO-8601 date strings back into real Date
// instances after every cache read, so a cached function is a drop-in
// replacement for the uncached one — callers never need to know or care.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function reviveDates<T>(value: T): T {
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(reviveDates) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = reviveDates(v);
    return out as T;
  }
  if (typeof value === "string" && ISO_DATE_RE.test(value)) return new Date(value) as unknown as T;
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors unstable_cache's own `Callback` type exactly, required for the generic constraint to unify
type Callback = (...args: any[]) => Promise<any>;

/** Drop-in replacement for `unstable_cache` that also fixes its Date-to-string
 * serialization gotcha. Use this instead of `unstable_cache` directly for any
 * cached function whose result includes a Prisma record (or anything else
 * with real `Date` fields). Mirrors `unstable_cache`'s own single-generic
 * signature (`<T extends Callback>(cb: T, ...): T`) so it preserves the exact
 * Prisma return type — a two-type-param version loses inference on complex
 * `include`-shaped results and widens everything to `unknown`. */
export function cachedQuery<T extends Callback>(
  cb: T,
  keyParts: string[],
  options?: { revalidate?: number | false; tags?: string[] }
): T {
  const cached = unstable_cache(cb, keyParts, options);
  return (async (...args: Parameters<T>) => reviveDates(await cached(...args))) as T;
}
