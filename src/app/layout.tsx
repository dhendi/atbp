import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getSiteUrl } from "@/lib/site-url";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
});

const SITE_NAME = "ATBP";
const SITE_TITLE = "ATBP — Find something different.";
const SITE_DESCRIPTION =
  "ATBP (at iba pa) is a marketplace for handmade, vintage, pre-loved, and collectible items — plus services and local snacks — from independent sellers across the Philippines.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  // A page that sets its own `title` (a plain string) renders exactly that,
  // via the `template`, as "<page title> | ATBP" — pages only need to set
  // `title` here for the "%s" swap to apply; the fallback (`default`) is
  // what every page that sets nothing at all inherits, same as before.
  title: { default: SITE_TITLE, template: "%s | ATBP" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["Philippines marketplace", "handmade", "vintage", "pre-loved", "collectibles", "online shop Philippines", "Filipino sellers"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ATBP",
  },
  // Per-page `openGraph`/`twitter` blocks (product, seller, etc.) override
  // these field-by-field, not wholesale — so every page gets a sane social
  // preview even if it only bothers to set `title`/`description`.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_PH",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#c95532",
};

// Site-wide identity for search engines and AI answer engines alike — this
// is what lets a result for ATBP show a proper knowledge-panel-style entity
// (name, description, logo) instead of just a blue link, and it's the one
// piece of structured data that belongs on every page rather than per-route.
// Product/seller pages layer their own Product/Organization schema on top of
// this, not instead of it.
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ATBP",
  alternateName: "ATBP (at iba pa)",
  url: getSiteUrl(),
  logo: `${getSiteUrl()}/icon.svg`,
  description:
    "ATBP is an online marketplace where independent sellers across the Philippines list handmade, vintage, pre-loved, and collectible items, plus services and local snacks.",
  areaServed: { "@type": "Country", name: "Philippines" },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ATBP",
  url: getSiteUrl(),
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${getSiteUrl()}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c") }}
        />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
