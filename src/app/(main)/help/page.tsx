import type { Metadata } from "next";
import Link from "next/link";
import { Truck, CreditCard, Store, ShieldCheck, Heart, MessageCircle } from "lucide-react";

// Title kept as just the label ("Help Center") rather than the old
// hand-appended "Help Center | ATBP": the root layout's title template now
// appends " | ATBP" itself, so a literal "| ATBP" baked in here would double up.
const HELP_TITLE = "Help Center";
const HELP_DESCRIPTION =
  "Answers to common ATBP questions about orders, shipping, payments, selling, account security, and wishlists, plus how to contact support.";

export const metadata: Metadata = {
  title: HELP_TITLE,
  description: HELP_DESCRIPTION,
  openGraph: { title: HELP_TITLE, description: HELP_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: HELP_TITLE, description: HELP_DESCRIPTION },
};

const categories = [
  { href: "#orders", icon: Truck, label: "Orders & Shipping" },
  { href: "#payments", icon: CreditCard, label: "Payments" },
  { href: "#selling", icon: Store, label: "Selling on ATBP" },
  { href: "#account", icon: ShieldCheck, label: "Account & Security" },
  { href: "#wishlist", icon: Heart, label: "Wishlist & Collections" },
];

const faqs: { section: string; icon: typeof Truck; questions: { q: string; a: string }[] }[] = [
  {
    section: "orders",
    icon: Truck,
    questions: [
      {
        q: "How long does shipping take?",
        a: "Delivery windows are shown on the product page and after checkout, calculated from real business days rather than a generic estimate. Most items ship via J&T Express or LBC, with the exact carrier set by the seller. Made-to-order items add the seller's stated production time before that shipping window starts.",
      },
      {
        q: "Can I track my order?",
        a: "Yes, open the order from My Orders to see its status (Payment Confirmed, Processing, Shipped, Delivered) plus tracking number and courier once the seller marks it shipped.",
      },
      {
        q: "Can I pick up my order instead of having it shipped?",
        a: "If the seller offers it, you'll see \"Pick up locally\" or \"ATBP Pickup Spot\" as fulfillment options at checkout. Some sellers also offer local delivery within their area.",
      },
      {
        q: "What if my order never arrives or arrives damaged?",
        a: "Message the seller first from the order page. Most issues are resolved directly. If that doesn't work, open a dispute from the order page and our team will review it.",
      },
      {
        q: "Can I cancel or change an order after placing it?",
        a: "Message the seller as soon as possible. Orders move to production or shipping quickly, especially made-to-order items, so changes can only be made before the seller starts fulfilling it.",
      },
    ],
  },
  {
    section: "payments",
    icon: CreditCard,
    questions: [
      {
        q: "What payment methods are accepted?",
        a: "GCash, Maya, QR Ph, credit/debit card, online banking, and cash on delivery (where the seller supports it). Pick one at checkout.",
      },
      {
        q: "Is my payment information safe?",
        a: "ATBP does not directly collect or store your complete card or wallet credentials. Payments are processed through the payment methods integrated with checkout.",
      },
      {
        q: "How do promo codes work?",
        a: "A promo code applies only to items from the seller who issued it. Enter it at checkout and it discounts just that seller's items in your cart, not your whole order.",
      },
      {
        q: "How do refunds work?",
        a: "If a dispute is resolved in your favor, the refund is issued to your original payment method. Check your order page for the current status.",
      },
    ],
  },
  {
    section: "selling",
    icon: Store,
    questions: [
      {
        q: "How do I start selling on ATBP?",
        a: "Apply from Sell on ATBP in your profile menu. Once approved, you can list products and manage orders from your Seller Studio.",
      },
      {
        q: "How much does ATBP take per sale?",
        a: "A simple 10% commission on Free and Pro, or 8% on Premium. There's also a flat ₱15 processing fee on orders paid by card, online banking, or cash on delivery. GCash, Maya, and QR Ph carry no extra fee. See Seller pricing in the footer for the full breakdown.",
      },
      {
        q: "How do payouts work?",
        a: "Request a payout from your Seller Studio once you have a balance. Payouts go to your linked bank account, GCash, or Maya.",
      },
      {
        q: "Can I offer made-to-order or custom items?",
        a: "Yes, mark a listing as made-to-order with a production time and customization options, and buyers will see that timeline before ordering.",
      },
    ],
  },
  {
    section: "account",
    icon: ShieldCheck,
    questions: [
      {
        q: "How do I reset my password?",
        a: "Use \"Forgot password\" on the login page to reset it by email.",
      },
      {
        q: "How do I change my email, username, or address?",
        a: "Update your details from your profile settings, or manage saved shipping addresses under Addresses.",
      },
      {
        q: "How do I report a listing, seller, or user?",
        a: "Use the Report option on the product or shop page. Our team reviews every report and updates you once it's handled.",
      },
      {
        q: "How do I delete my account?",
        a: "Contact us through the form below and we'll process your request.",
      },
    ],
  },
  {
    section: "wishlist",
    icon: Heart,
    questions: [
      {
        q: "How does the wishlist work?",
        a: "Save any product with the heart icon. You can turn on notifications for price drops, restocks, and low-stock alerts from your Saved Items settings.",
      },
      {
        q: "What are Collections?",
        a: "Collections are your own boards for organizing saved products, shops, or drops. Create one from My Collections and add items as you browse.",
      },
      {
        q: "Can I share a Collection?",
        a: "Yes, mark a Collection public from its settings to get a shareable link.",
      },
      {
        q: "How does Following work?",
        a: "Follow a shop to get notified about new listings. Manage who you follow from the Following page in your profile.",
      },
    ],
  },
];

export default function HelpCenterPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.flatMap((group) =>
      group.questions.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }))
    ),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 md:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />
      <h1 className="font-display text-3xl font-semibold text-ink-900">Help Center</h1>
      <p className="mt-2 text-sm text-ink-500">Answers to common questions, or reach our team directly.</p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-center gap-2.5 rounded-2xl border border-ink-100 bg-white p-3 text-sm font-semibold text-ink-800 hover:bg-ink-50"
          >
            <c.icon size={16} className="shrink-0 text-brand-600" />
            {c.label}
          </Link>
        ))}
      </div>

      {/* ---------- HOW BUYING WORKS — only real, implemented steps/signals ---------- */}
      <div className="mt-10 rounded-2xl border border-ink-100 bg-white p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">How buying on ATBP works</p>
        <ol className="space-y-2.5 text-sm text-ink-700">
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">1</span>
            <span>Find something through Explore, search, or categories.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">2</span>
            <span>Check the seller&apos;s shop page: ratings from real buyers (once a shop has any), and badges like BIR Verified or Founding Seller where they apply.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">3</span>
            <span>Add to cart and check out with GCash, Maya, QR Ph, card, online banking, or cash on delivery where the seller supports it.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">4</span>
            <span>
              Track your order from <Link href="/orders" className="font-semibold text-brand-600 hover:underline">My Orders</Link> as it moves through Processing, Shipped, In Transit, and Delivered.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">5</span>
            <span>Something wrong? Message the seller from the order page first, or open a dispute if that doesn&apos;t resolve it.</span>
          </li>
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-ink-500">
          On prepaid orders, you can optionally add Buyer Protection at checkout: a small fee (3% of your item subtotal + ₱10, capped at ₱150) that backs a refund guarantee if a dispute is resolved in your favor. It&apos;s off by default and doesn&apos;t apply to cash on delivery, since you inspect the item before paying.
        </p>
      </div>

      <div className="mt-10 space-y-10">
        {faqs.map((group) => (
          <section key={group.section} id={group.section} className="scroll-mt-20">
            <div className="mb-3 flex items-center gap-2">
              <group.icon size={18} className="text-brand-600" />
              <h2 className="font-display text-lg font-semibold text-ink-900">
                {categories.find((c) => c.href === `#${group.section}`)?.label}
              </h2>
            </div>
            <div className="divide-y divide-ink-100 rounded-card border border-ink-100 bg-white">
              {group.questions.map((item) => (
                <details key={item.q} className="group px-4 py-3.5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-900">
                    {item.q}
                    <span className="shrink-0 text-ink-400 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 rounded-card border border-ink-100 bg-ink-50 p-6 text-center">
        <MessageCircle size={22} className="text-brand-600" />
        <p className="font-bold text-ink-900">Still need help?</p>
        <p className="max-w-xs text-sm text-ink-500">Send our team a message and we&apos;ll get back to you.</p>
        <Link
          href="/help/contact"
          className="mt-1 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
