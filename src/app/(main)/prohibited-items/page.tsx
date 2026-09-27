import type { Metadata } from "next";
import Link from "next/link";

// Title kept as just the label ("Prohibited Items"), not the old
// hand-appended "Prohibited Items | ATBP": the root layout's title template
// now appends " | ATBP" itself, so a literal "| ATBP" baked in here would double up.
const PROHIBITED_TITLE = "Prohibited Items";
const PROHIBITED_DESCRIPTION =
  "See what sellers may not list on ATBP, including weapons, counterfeit goods, illegal drugs, and other items restricted under Philippine law.";

export const metadata: Metadata = {
  title: PROHIBITED_TITLE,
  description: PROHIBITED_DESCRIPTION,
  openGraph: { title: PROHIBITED_TITLE, description: PROHIBITED_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: PROHIBITED_TITLE, description: PROHIBITED_DESCRIPTION },
};

export default function ProhibitedItemsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Prohibited Items</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-700">
        This list expands on{" "}
        <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
          Section 5 of our Terms of Service
        </Link>
        . It&apos;s what sellers may not list on ATBP, drawn from the Consumer Act of the Philippines (RA 7394), the
        Intellectual Property Code, and FDA regulations on regulated goods. A listing that violates this policy gets
        removed and logs a warning against the seller&apos;s account. See our{" "}
        <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
          Terms
        </Link>{" "}
        for how that process works.
      </p>

      <div className="mt-8 space-y-3 text-sm leading-relaxed text-ink-700">
        <Item title="Weapons, ammunition, and explosives">
          Firearms, firearm parts, ammunition, explosives, and other regulated weapons.
        </Item>
        <Item title="Illegal drugs and drug paraphernalia">
          Any controlled substance and any item primarily intended for its use.
        </Item>
        <Item title="Counterfeit or pirated goods">
          Items that copy or imitate a genuine brand, product, or copyrighted work without authorization.
        </Item>
        <Item title="Prescription medicines and medical devices without proper FDA clearance">
          Any drug or device requiring FDA registration/clearance that lacks it.
        </Item>
        <Item title="Live animals">Live animals of any kind.</Item>
        <Item title="Tobacco, vape, and alcohol products sold to minors">
          These categories may only be sold to buyers who meet the applicable legal age.
        </Item>
        <Item title="Stolen goods or unauthorized government property/IDs">
          Stolen property, and any government-issued property, document, or ID reproduced or sold without authorization.
        </Item>
        <Item title="Fraudulent listings">
          A listing for an item that doesn&apos;t exist, isn&apos;t actually available, or is materially misrepresented to induce a purchase.
        </Item>
        <Item title="Items our payment methods won't process">
          Anything that GCash, Maya, card networks, or another payment method supported at checkout prohibits under their own merchant rules.
        </Item>
        <Item title="Hazardous or regulated chemicals">
          Chemicals or substances that are hazardous, controlled, or require special handling/registration to sell.
        </Item>
        <Item title="Items infringing a third party's trademark or copyright">
          Anything that uses another party&apos;s brand, logo, design, or creative work without the right to do so.
        </Item>
        <Item title="Reselling or distributing content you don't own or aren't licensed to sell">
          Applies to ATBP Services and digital products specifically: pirated or cracked software, media, fonts, templates, or
          any digital file/service you don&apos;t hold the rights to sell. Sellers attest to this at listing time.
        </Item>
        <Item title="Academic dishonesty">
          Writing essays, theses, or assignments, or taking a test/exam, on a student&apos;s behalf. Legitimate tutoring and
          lessons are welcome, but the line is teaching a skill versus doing someone&apos;s graded work for them.
        </Item>
        <Item title="Regulated professional advice">
          Legal, medical, financial, tax, or any other service that requires a professional license to provide.
        </Item>
      </div>

      <p className="mt-8 text-xs text-ink-500">
        This list may be expanded as needed. If you&apos;re unsure whether something you want to sell is allowed, contact{" "}
        <Link href="/help/contact" className="font-semibold text-brand-600 hover:underline">
          Support
        </Link>{" "}
        before listing it.
      </p>
    </div>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <p className="font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-ink-600">{children}</p>
    </div>
  );
}
