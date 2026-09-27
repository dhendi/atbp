import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { AUCTIONS_ENABLED, MARKETS_ENABLED } from "@/lib/feature-flags";
import { LEGAL_CONFIG, legalConfigIsComplete } from "@/lib/legal-config";
import { SOCIAL_LINKS } from "@/lib/site-config";

const columns = [
  {
    heading: "Discover",
    links: [
      { href: "/discover", label: "Explore" },
      { href: "/shops", label: "Shops" },
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
      ...(MARKETS_ENABLED ? [{ href: "/markets", label: "ATBP Markets" }] : []),
      { href: "/search", label: "Search" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "/help", label: "Help Center" },
      { href: "/help/contact", label: "Contact Support" },
      { href: "/about", label: "About ATBP" },
    ],
  },
];

const SOCIALS = [
  { label: "Facebook", href: SOCIAL_LINKS.facebook },
  { label: "Instagram", href: SOCIAL_LINKS.instagram },
  { label: "TikTok", href: SOCIAL_LINKS.tiktok },
].filter((s) => s.href);

export function Footer() {
  // Registered-business details are shown only once they're real: the
  // placeholders in legal-config must never appear in a public footer.
  const showBusiness = legalConfigIsComplete();
  return (
    <footer className="border-t border-ink-100 bg-white px-4 pb-8 pt-10 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500">
              A Philippine marketplace for handmade, vintage, pre-loved, and collectible items.
            </p>
            <p className="mt-3 text-sm text-ink-600">
              <a href={`mailto:${LEGAL_CONFIG.privacyContactEmail}`} className="hover:text-ink-900">{LEGAL_CONFIG.privacyContactEmail}</a>
            </p>
            {SOCIALS.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {SOCIALS.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-ink-600 hover:text-ink-900">{s.label}</a>
                  </li>
                ))}
              </ul>
            )}
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
          <p>
            © {new Date().getFullYear()} {showBusiness ? LEGAL_CONFIG.entityName : "ATBP (at iba pa)"}. All rights reserved.
            {showBusiness && <span className="block">{LEGAL_CONFIG.entityAddress}</span>}
          </p>
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
