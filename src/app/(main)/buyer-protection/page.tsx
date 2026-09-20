import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, MessageCircle, FileSearch, Scale, PackageCheck } from "lucide-react";

const TITLE = "Buyer Protection & Returns";
const DESCRIPTION =
  "How ATBP handles a damaged, wrong, missing, or undelivered order: the redress process every order gets, and what the optional Buyer Protection add-on covers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const LAST_UPDATED = "September 19, 2026";

export default function BuyerProtectionPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Buyer Protection &amp; Returns</h1>
      <p className="mt-3 text-sm text-ink-500">Last Updated: {LAST_UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink-700">
        <p>
          This page explains what happens if something goes wrong with an order on ATBP. It&apos;s part of the{" "}
          <Link href="/terms" className="font-semibold text-brand-600 hover:underline">Terms of Service</Link>. It
          does not promise a refund in every situation. Every case is reviewed on its own facts, and the outcome
          depends on what actually happened and what the Seller, ATBP, and evidence show.
        </p>

        <section>
          <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Two layers of protection</h2>
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-4">
              <p className="flex items-center gap-2 font-bold text-ink-900"><Scale size={16} className="text-brand-600" /> Every order: the redress process</p>
              <p className="mt-1.5 text-ink-600">
                Every Buyer, on every order, can open a dispute and have ATBP review it. This costs nothing extra and
                doesn&apos;t depend on any checkout option. If ATBP determines the Seller is responsible, we&apos;ll work
                with the Seller toward a resolution, which may include a refund the Seller issues, a replacement, or
                another fix. This is the baseline redress mechanism required under the Internet Transactions Act (RA
                11967), described further in{" "}
                <Link href="/terms" className="font-semibold text-brand-600 hover:underline">Section 13 of the Terms</Link>.
              </p>
            </div>
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
              <p className="flex items-center gap-2 font-bold text-ink-900"><ShieldCheck size={16} className="text-brand-600" /> Optional: Buyer Protection</p>
              <p className="mt-1.5 text-ink-600">
                At checkout on a prepaid order, you can opt in to Buyer Protection for a small fee shown before you
                pay. If your order never arrives, or arrives significantly not as described, and the Seller can&apos;t or
                won&apos;t make it right, ATBP guarantees the refund itself out of ATBP&apos;s own funds, rather than the
                outcome depending entirely on recovering something from the Seller. Buyer Protection isn&apos;t available
                on Cash on Delivery orders, since you inspect the item before paying for those.
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            In short: the redress process is always available and is what determines fault. Buyer Protection changes
            who ultimately guarantees the money if the Seller doesn&apos;t make it right, not whether you can open a
            case at all.
          </p>
        </section>

        <section>
          <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">How a dispute is handled</h2>
          <ol className="space-y-3">
            <Step icon={MessageCircle} n={1} title="You report the issue">
              From the order page, message the Seller first for most issues, since many are resolved directly and
              quickly that way. If that doesn&apos;t resolve it, open a dispute from the same order page and describe
              what happened.
            </Step>
            <Step icon={FileSearch} n={2} title="ATBP reviews it">
              Our team looks at the order, the listing as it was written, and anything you&apos;ve provided (photos of
              a damaged or wrong item, for example, are the single most useful thing you can attach).
            </Step>
            <Step icon={MessageCircle} n={3} title="The Seller gets a chance to respond">
              The Seller can explain their side and provide their own evidence, such as proof of shipment or
              packaging photos, before a decision is made.
            </Step>
            <Step icon={Scale} n={4} title="ATBP decides the marketplace resolution">
              Where the facts are clear, ATBP determines the appropriate outcome under this policy and the Seller&apos;s
              own return practices. This isn&apos;t a court process and doesn&apos;t replace your legal rights (see the{" "}
              <Link href="/terms" className="font-semibold text-brand-600 hover:underline">Terms</Link>), but it&apos;s
              usually the fastest path to a resolution.
            </Step>
            <Step icon={PackageCheck} n={5} title="Resolution">
              Depending on the case, this may be a refund, a replacement, a partial refund, or a finding that the
              order was fulfilled as described and no further action is warranted.
            </Step>
          </ol>
        </section>

        <section>
          <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Situations you can bring to us</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>The item arrived damaged.</li>
            <li>You received the wrong item.</li>
            <li>Part of your order is missing.</li>
            <li>The item is significantly different from how it was described or photographed (not a minor difference in shade or texture that&apos;s typical of a handmade or pre-loved item).</li>
            <li>You have strong reason to believe a listing was counterfeit or fraudulent.</li>
            <li>Your order never arrived and tracking shows no realistic path to delivery.</li>
            <li>You need to cancel before the Seller has fulfilled the order, or the Seller needs to cancel because the item is no longer available.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mb-3 text-lg font-semibold text-ink-900">Who&apos;s responsible for what</h2>
          <div className="space-y-2 text-ink-600">
            <p><strong className="text-ink-900">The Seller</strong> is responsible for accurately describing and packaging their item, and for their own stated return policy.</p>
            <p><strong className="text-ink-900">ATBP</strong> reviews disputes, decides the marketplace resolution, and, for a Buyer-Protected order that qualifies, guarantees the refund itself.</p>
            <p><strong className="text-ink-900">The payment provider</strong> handles the mechanics of actually processing a refund or a reversal back to your payment method once one is approved.</p>
            <p><strong className="text-ink-900">The courier</strong> is responsible for a package once the Seller hands it over; a lost or badly delayed shipment is something ATBP factors into its review, but the courier&apos;s own service record and tracking data inform that decision.</p>
          </div>
        </section>

        <p className="text-xs text-ink-500">
          Questions about a specific order should go through that order&apos;s page or the{" "}
          <Link href="/help/contact" className="font-semibold text-brand-600 hover:underline">contact form</Link>{" "}
          rather than this page, so our team has the actual order in front of them.
        </p>
      </div>
    </div>
  );
}

function Step({ icon: Icon, n, title, children }: { icon: typeof MessageCircle; n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-ink-100 bg-white p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <Icon size={15} />
      </div>
      <div>
        <p className="font-bold text-ink-900">{n}. {title}</p>
        <p className="mt-1 text-ink-600">{children}</p>
      </div>
    </li>
  );
}
