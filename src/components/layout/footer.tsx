import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { AUCTIONS_ENABLED } from "@/lib/feature-flags";

const columns = [
  {
    heading: "Discover",
    links: [
      { href: "/discover", label: "Explore" },
      ...(AUCTIONS_ENABLED ? [{ href: "/auctions", label: "Auctions" }] : []),
      { href: "/deals", label: "Deals" },
      { href: "/trending", label: "Trending" },
      { href: "/events", label: "Events" },
    ],
  },
  {
    heading: "Marketplace",
    links: [
      { href: "/sell", label: "Sell on ATBP" },
      { href: "/pricing", label: "Seller pricing" },
      { href: "/markets", label: "ATBP Markets" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "/help", label: "Help Center" },
      { href: "/help/contact", label: "Contact Support" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white px-4 pb-8 pt-10 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500">
              A Philippine marketplace for handmade, vintage, pre-loved, and collectible items.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{col.heading}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-ink-600 hover:text-ink-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5 text-xs text-ink-400">
          <p>© {new Date().getFullYear()} ATBP (at iba pa). All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-ink-700">Terms</Link>
            <Link href="/privacy" className="hover:text-ink-700">Privacy</Link>
            <Link href="/buyer-protection" className="hover:text-ink-700">Buyer Protection</Link>
            <Link href="/prohibited-items" className="hover:text-ink-700">Prohibited Items</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
