import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONFIG } from "@/lib/legal-config";

const ABOUT_TITLE = "About ATBP";
const ABOUT_DESCRIPTION = "ATBP (at iba pa) is a Philippine marketplace for handmade, vintage, pre-loved, and collectible items from independent sellers.";

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  openGraph: { title: ABOUT_TITLE, description: ABOUT_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 md:px-6">
      <p className="font-tag text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">About us</p>
      <h1 className="font-display mt-2 text-3xl font-semibold leading-tight text-ink-900 md:text-4xl">
        Everything Filipino, <em className="italic text-brand-600">at iba pa.</em>
      </h1>

      <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-700">
        <p>
          ATBP stands for &quot;at iba pa&quot;, the Filipino way of saying &quot;and others.&quot; It is a marketplace for the things
          that don&apos;t fit neatly on a big-box shelf: handmade goods, vintage finds, pre-loved pieces, and
          collectibles, sold by independent sellers across the Philippines.
        </p>
        <p>
          Anyone can sell here. Casual sellers can open a Closet or run a Yard Sale to clear out what they own, and
          registered businesses can open a full Shop. Every seller verifies their identity with a government ID and a
          live selfie before they list, so buyers know a real person is behind each shop.
        </p>
        <p>
          Buyers are covered by{" "}
          <Link href="/buyer-protection" className="font-semibold text-brand-600 hover:underline">Buyer Protection</Link>, and
          anything that isn&apos;t allowed is spelled out in the{" "}
          <Link href="/prohibited-items" className="font-semibold text-brand-600 hover:underline">Prohibited Items</Link> list.
        </p>
      </div>

      <div className="mt-8 rounded-card border border-ink-200 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-ink-900">Contact</h2>
        <p className="mt-2 text-sm text-ink-600">
          Questions, feedback, or something wrong with an order? Email{" "}
          <a href={`mailto:${LEGAL_CONFIG.privacyContactEmail}`} className="font-semibold text-brand-600 hover:underline">{LEGAL_CONFIG.privacyContactEmail}</a>{" "}
          or use the <Link href="/help/contact" className="font-semibold text-brand-600 hover:underline">contact form</Link>.
        </p>
      </div>
    </div>
  );
}
