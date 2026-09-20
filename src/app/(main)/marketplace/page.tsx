import { redirect } from "next/navigation";

// The marketplace grid now lives at /discover — this route stays around
// so older links keep working, forwarding along any query string.
export default async function MarketplaceRedirect({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(sp).toString();
  redirect(qs ? `/discover?${qs}` : "/discover");
}
