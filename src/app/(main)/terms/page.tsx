import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONFIG } from "@/lib/legal-config";

// Title kept as just the label ("Terms of Service"), not the old
// hand-appended "Terms of Service | ATBP": the root layout's title template
// now appends " | ATBP" itself, so a literal "| ATBP" baked in here would double up.
const TERMS_TITLE = "Terms of Service";
const TERMS_DESCRIPTION =
  "Read the ATBP Terms of Service covering buyer and seller responsibilities, fees, prohibited items, dispute resolution, and Philippine e-commerce law.";

export const metadata: Metadata = {
  title: TERMS_TITLE,
  description: TERMS_DESCRIPTION,
  openGraph: { title: TERMS_TITLE, description: TERMS_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: TERMS_TITLE, description: TERMS_DESCRIPTION },
};

// Last substantive revision of this page — update when the legal content
// changes, independent of unrelated site deploys. Not tied to git history:
// a Terms/Privacy "Last Updated" date is a legal fact people rely on, so it's
// set deliberately here rather than derived from a build timestamp.
const LAST_UPDATED = "September 19, 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Terms of Service</h1>
      <p className="mt-1 text-sm text-ink-500">ATBP / ATBP (at iba pa)</p>
      <p className="mt-3 text-sm text-ink-500">Last Updated: {LAST_UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink-700">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern access to and use of the ATBP website and related services
          (collectively, the &quot;Platform&quot;), operated by <Placeholder>{LEGAL_CONFIG.entityName}</Placeholder> (&quot;ATBP,&quot;
          &quot;we,&quot; &quot;us&quot;), with registered address at <Placeholder>{LEGAL_CONFIG.entityAddress}</Placeholder>. By
          creating an account, browsing, or transacting on the Platform, you (&quot;User&quot;) agree to be bound by these
          Terms. If you do not agree, do not use the Platform.
        </p>

        <Section title="1. What ATBP Is">
          <div className="space-y-3">
            <p>
              ATBP is an online marketplace that connects independent sellers (&quot;Sellers&quot;) with buyers
              (&quot;Buyers&quot;) across the Philippines, for handmade, pre-loved, vintage, collectible, and other
              small-shop items, as well as custom services and digital products that Sellers choose to list.
            </p>
            <p>
              <strong className="text-ink-900">ATBP does not own, manufacture, warehouse, or directly sell the
              products listed on the Platform.</strong> Each listing is created and controlled by the Seller who
              posted it, and each sale is a direct transaction between a Buyer and a Seller. ATBP&apos;s role is to
              provide the marketplace technology, payment facilitation, messaging, and dispute-handling
              infrastructure that makes those transactions possible, and to apply the verification, moderation, and
              redress duties described below. Sellers remain responsible for their own products, listings, and
              transactions, subject to the marketplace obligations ATBP imposes on them under these Terms.
            </p>
          </div>
        </Section>

        <Section title="2. Buyer Accounts">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>You must be at least 18 years old, or the age of majority in your jurisdiction, and capable of entering a binding contract under Philippine law. A guest checkout (no account) is available for browsing and buying without registering, subject to the same age requirement.</li>
            <li>Account information must be accurate and kept up to date, including your name, contact details, and any delivery addresses you save. You are responsible for all activity under your account and for keeping your login credentials confidential.</li>
            <li>You must not create an account using a false identity, impersonate another person or business, operate multiple accounts to evade a restriction (such as a suspension or a promotion&apos;s eligibility rules), or use the Platform for any unlawful purpose.</li>
            <li>ATBP may suspend or terminate an account that provides false information, violates these Terms, or is used for fraudulent, abusive, or unlawful conduct. Where reasonably possible, ATBP will tell you why an account was suspended or terminated.</li>
          </ul>
        </Section>

        <Section title="3. Seller Accounts">
          <div className="space-y-3">
            <p>
              <strong className="text-ink-900">3.1 Application and verification.</strong> Before a Seller account is
              approved, ATBP requires a government-issued ID for identity verification, and, for a Seller applying
              as a registered business, a BIR Certificate of Registration. ATBP may, where reasonable and lawful:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>verify a Seller&apos;s identity and, where applicable, business registration;</li>
              <li>request additional information or documents needed to confirm who a Seller is or what they intend to sell;</li>
              <li>decline a Seller application, including where submitted information appears false, incomplete, or unverifiable;</li>
              <li>require a Seller to resubmit identity or business documents if the first submission is rejected on review; and</li>
              <li>periodically request updated information where a Seller&apos;s circumstances change (e.g., a change in business registration status).</li>
            </ul>
            <p>
              <strong className="text-ink-900">3.2 What&apos;s public vs. private.</strong> Identity documents,
              government ID scans, and business registration documents submitted for verification are reviewed by
              ATBP staff only and are never displayed on a Seller&apos;s public shop page. A Seller&apos;s public profile
              shows only what the Seller chooses to add there (shop name, handle, description, banner/logo, general
              area/city rather than a home address unless the Seller opts to show one, and, for a verified business
              Seller, a &quot;verified&quot; indicator) plus information generated by using the Platform (ratings, review
              count, badges, and listings).
            </p>
            <p>
              <strong className="text-ink-900">3.3 Ongoing standing.</strong> ATBP may restrict a Seller&apos;s selling
              privileges, remove a listing, suspend or terminate a Seller account, or investigate an account for
              suspected policy violations or suspicious activity, including for repeated buyer complaints, a pattern
              of cancelled or undelivered orders, listing a prohibited item, or any conduct described in Section 4
              below. Section 9 describes how ATBP handles content removal and account actions in more detail.
            </p>
          </div>
        </Section>

        <Section title="4. Seller Responsibilities">
          <p>By listing on ATBP, a Seller agrees to:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>describe products accurately, including condition, and not misrepresent what a Buyer will receive;</li>
            <li>set and honor accurate prices, and keep listed quantity/stock reasonably up to date;</li>
            <li>fulfil an accepted order: pack the item appropriately for its condition and shipping method, and ship, hand over for courier pickup, or make available for local pickup within the timeframe stated on the listing or in ATBP&apos;s seller guidelines;</li>
            <li>only list products the Seller owns or is legally entitled to sell, and never list counterfeit, stolen, or infringing goods;</li>
            <li>comply with the <Link href="/prohibited-items" className="font-semibold text-brand-600 hover:underline">Prohibited Items policy</Link> and all applicable Philippine laws relevant to what they sell;</li>
            <li>maintain a reasonable, clearly stated return/refund practice for their own shop, without contradicting the marketplace-wide protections described in Section 8;</li>
            <li>respond to legitimate Buyer messages and customer-service issues in good faith and within a reasonable time;</li>
            <li>provide accurate shipping/pickup information, including realistic handling times and a real courier/tracking reference once an order ships; and</li>
            <li>handle their own applicable tax obligations arising from sales made through the Platform (see also Section 7 on fees, which is separate from a Seller&apos;s own tax liability).</li>
          </ul>
        </Section>

        <Section title="5. Product Listings">
          <p>
            Every listing must include a title, an accurate price, a condition (for physical, non-new items), a
            quantity, and at least one photograph that represents the actual item being sold, not a stock or
            placeholder image, along with clear shipping or fulfillment information (courier shipping, local pickup,
            local delivery, or instant digital delivery, as applicable to that listing). Beyond these platform
            requirements, ATBP does not represent that any specific field is legally mandatory for every category of
            product; a Seller is responsible for knowing and meeting any additional disclosure that applicable
            Philippine law requires for what they are specifically selling (for example, food, cosmetics, or other
            regulated categories).
          </p>
        </Section>

        <Section title="6. Prohibited Products and Conduct">
          <p>
            Users may not list, sell, buy, or use the Platform to facilitate a transaction involving: illegal goods;
            counterfeit or pirated goods; stolen goods; unsafe or hazardous products; goods regulated in a way ATBP
            does not currently support (for example, requiring an FDA clearance the Platform has no process to
            verify); products that infringe a third party&apos;s intellectual property rights; fraudulent listings (a
            listing that does not describe a real, available item); anything a supported payment provider prohibits
            under its own merchant rules; or anything ATBP otherwise chooses not to permit, as published in the{" "}
            <Link href="/prohibited-items" className="font-semibold text-brand-600 hover:underline">
              Prohibited Items policy
            </Link>
            , which forms part of these Terms and may be updated as ATBP&apos;s marketplace categories evolve.
          </p>
        </Section>

        <Section title="7. User Content and Intellectual Property">
          <p>
            Users retain ownership of the content they upload (listing photos, descriptions, reviews, messages) but
            grant ATBP a non-exclusive, royalty-free, worldwide license to host, display, reproduce, and distribute
            that content for the purpose of operating and promoting the Platform. Users represent that they own or
            have the right to use any content they upload, and that it does not infringe a third party&apos;s
            intellectual property rights.
          </p>
        </Section>

        <Section title="8. Payments">
          <div className="space-y-3">
            <p>
              Buyers pay through the payment methods currently supported at checkout, as shown on the Platform.
              Payments are processed through the payment method integrations connected to the Platform from time to
              time; ATBP does not directly collect or store complete payment card numbers. Depending on the payment
              method chosen and the provider ultimately connected to it, a transaction may be subject to that
              provider&apos;s own terms, fraud checks, and security review, in addition to ATBP&apos;s own review under
              Section 11.
            </p>
            <p>
              A payment may be reversed, held, or refunded where the connected payment provider requires it (for
              example, a failed authorization, a reported unauthorized transaction, or a chargeback), where ATBP
              approves a refund under Section 8 (Buyer Protection) below, or where required by law. Where a payment
              already disbursed to a Seller is later reversed for one of these reasons, ATBP may recover the
              corresponding amount from that Seller&apos;s available balance or a future payout.
            </p>
          </div>
        </Section>

        <Section title="9. Seller Fees">
          <div className="space-y-3">
            <p>
              ATBP charges Sellers a commission on each completed sale, currently{" "}
              <strong className="text-ink-900">10% of the sale subtotal on the Free and Pro plans, and 8% on the
              Premium plan</strong> (including for Sellers on the Founding Seller Program&apos;s discounted &quot;Founding
              Premium&quot; rate, which carries the same 8% commission as standard Premium). This commission rate is
              intended by ATBP to be inclusive of VAT, not charged in addition to it; a Seller who is themselves
              VAT-registered should confirm with their own accountant how that applies to their own sales.
            </p>
            <p>
              A flat <strong className="text-ink-900">₱15 processing fee</strong> currently applies to an order paid
              by Credit/Debit Card or Online Banking, charged to the Seller. Where applicable, Pro and Premium also
              carry their own recurring subscription price, as does an Instant Payout request from Seller Studio.
              The complete, current fee schedule is published on ATBP&apos;s{" "}
              <Link href="/pricing" className="font-semibold text-brand-600 hover:underline">pricing page</Link> and
              a Seller&apos;s own Seller Studio, and applicable fees are deducted from, or charged against, the
              Seller&apos;s sale proceeds or payout as described there. ATBP may update these fees with reasonable
              prior notice to Sellers.
            </p>
          </div>
        </Section>

        <Section title="10. Orders">
          <div className="space-y-3">
            <p>
              A Buyer places an order by completing checkout for one or more listings; this is an offer to buy at the
              listed price. An order is confirmed once payment is authorized (or, for Cash on Delivery where
              available, once the order is placed). A Seller is expected to fulfil a confirmed order as described in
              Section 4; ATBP does not require a separate manual &quot;acceptance&quot; step for a standard listing, except
              for services and made-to-order items, which follow the delivery/acceptance flow shown on that order
              type.
            </p>
            <p>
              A Buyer may ask a Seller to cancel an order before it has shipped or otherwise entered fulfillment; a
              Seller may agree to cancel at that stage, or decline if the item has already been packed, shipped, or
              (for a made-to-order or service listing) put into production. If an item turns out to be out of stock
              or otherwise cannot be fulfilled after an order is placed, the Seller must inform the Buyer and cancel
              that order; a payment already collected for a cancelled order is refunded. A shipping problem after an
              order has left the Seller (lost, delayed, or damaged in transit) is handled under Section 11 (Buyer
              Protection) below.
            </p>
          </div>
        </Section>

        <Section title="11. Buyer Protection, Returns, and Disputes">
          <p>
            ATBP&apos;s framework for a damaged, wrong, missing, misrepresented, or undelivered order, including how
            responsibility is divided between the Seller, ATBP, the payment provider, and the courier, is described
            in full on the{" "}
            <Link href="/buyer-protection" className="font-semibold text-brand-600 hover:underline">
              Buyer Protection &amp; Returns
            </Link>{" "}
            page, which forms part of these Terms. ATBP does not guarantee a refund in every dispute; each case is
            reviewed on its own facts as described there.
          </p>
        </Section>

        <Section title="12. Suspicious Activity and Fraud Prevention">
          <p>
            To protect Buyers, Sellers, and the Platform, ATBP may take reasonable, proportionate action in response
            to suspicious activity, including reviewing an order or account, requesting additional verification from
            a Seller, temporarily pausing or suspending a listing or account, or delaying a payout, where doing so is
            supported by ATBP&apos;s own systems and consistent with these Terms and applicable payment provider
            agreements. ATBP may cooperate with a connected payment provider&apos;s own fraud or chargeback process, and
            will cooperate with Philippine authorities where legally required to do so (for example, in response to a
            valid subpoena or court order). ATBP does not represent that it can reverse or hold funds beyond what its
            own systems and its payment providers actually support at a given time.
          </p>
        </Section>

        <Section title="13. Redress Mechanism and Complaints">
          <div className="space-y-3">
            <p>
              ATBP provides a complaint and redress mechanism for a Buyer or Seller complaint arising from a
              transaction, listing, payment, fraud concern, an intellectual-property complaint, or a privacy
              complaint, reachable through the Platform&apos;s{" "}
              <Link href="/help/contact" className="font-semibold text-brand-600 hover:underline">contact form</Link>{" "}
              or, for an order-specific issue, directly from that order&apos;s page. ATBP will acknowledge and act on a
              complaint promptly.
            </p>
            <p>
              Consistent with the Internet Transactions Act (Republic Act No. 11967), ATBP&apos;s internal redress
              mechanism is deemed exhausted if a complaint remains unresolved seven (7) calendar days after it is
              filed, after which the complaining party may escalate the matter to the Department of Trade and
              Industry&apos;s Electronic Commerce Bureau, the DTI&apos;s Online Dispute Resolution mechanism once
              available, or pursue any other remedy available under Philippine law. Using ATBP&apos;s own complaint
              process first does not waive or limit a User&apos;s right to pursue any other legal remedy at any time.
            </p>
          </div>
        </Section>

        <Section title="14. Content Removal and Account Actions">
          <p>
            Upon receiving a valid notice that a listing or other content is illegal, counterfeit, unsafe, or
            otherwise violates these Terms or applicable law, ATBP will act expeditiously to remove or disable access
            to that content. ATBP may also suspend or terminate a Seller&apos;s or Buyer&apos;s access to the Platform for
            violations of these Terms, repeated complaints, or conduct that creates risk for other Users.
          </p>
        </Section>

        <Section title="15. Liability">
          <p>
            As between a Buyer and a Seller, the Seller is primarily responsible for their own products, listings,
            and the transaction itself. ATBP&apos;s own liability to a User is limited to direct damages arising from
            ATBP&apos;s own acts or omissions in operating the Platform, except that, consistent with the Internet
            Transactions Act, ATBP may hold subsidiary liability where it fails to exercise ordinary diligence in
            meeting its own marketplace obligations under that law, or fails to act after proper notice to remove
            content that is illegal, infringing, or unsafe, and may hold solidary liability with a Seller where it
            fails, after such notice, to remove or disable access to goods that are prohibited by law or imminently
            dangerous. Nothing in these Terms limits any liability that cannot be limited under Philippine law, and
            nothing here is intended to describe every circumstance in which that law applies; where the exact scope
            of ATBP&apos;s liability for a specific situation is unclear, it should be assessed against the current text
            of RA 11967 and its implementing rules at that time.
          </p>
        </Section>

        <Section title="16. Data Privacy">
          <p>
            ATBP&apos;s collection and use of personal data, including what is shared between a Buyer and a Seller to
            fulfil an order, is described in the{" "}
            <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">ATBP Privacy Policy</Link>,
            which forms part of these Terms. By using the Platform, Users agree to that Privacy Policy.
          </p>
        </Section>

        <Section title="17. Amendments">
          <p>
            ATBP may update these Terms from time to time. Material changes will be notified to Users through the
            Platform or by email before taking effect. Continued use of the Platform after changes take effect
            constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="18. Governing Law and Venue">
          <p>
            These Terms are governed by the laws of the Republic of the Philippines, including the Internet
            Transactions Act (RA 11967), the Consumer Act (RA 7394), the E-Commerce Act (RA 8792), and the Data
            Privacy Act (RA 10173). Any dispute not resolved through the mechanism in Section 13 shall be subject to
            the exclusive jurisdiction of the proper courts of <Placeholder>{LEGAL_CONFIG.governingCity}</Placeholder>,
            Philippines, without prejudice to any User&apos;s rights before the DTI or other competent government
            agency.
          </p>
        </Section>

        <Section title="19. Contact">
          <p>
            Questions or complaints about these Terms or a transaction on the Platform may be sent to{" "}
            <a href="mailto:contact@atbph.com" className="font-semibold text-brand-600 hover:underline">contact@atbph.com</a>, or through the Platform&apos;s{" "}
            <Link href="/help/contact" className="font-semibold text-brand-600 hover:underline">contact form</Link>.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display mb-2 text-lg font-semibold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

/** Marks a value that must be filled in before launch (registered business
 * name/address, governing city) — deliberately left as visible placeholder
 * text rather than an invented value. Sourced from LEGAL_CONFIG so there's
 * exactly one place to update once the entity's real details are confirmed. */
function Placeholder({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-gold-100 px-1.5 py-0.5 font-mono text-[13px] font-semibold text-gold-700">{children}</span>;
}
