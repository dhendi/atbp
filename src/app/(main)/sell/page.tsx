import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rocket, Shirt, Tent, Store, ArrowRight, Handshake, Download, Search, Star, Wallet } from "lucide-react";
import { SERVICES_ENABLED, DIGITAL_PRODUCTS_ENABLED } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

const SELL_TITLE = "Sell on ATBP";
const SELL_DESCRIPTION =
  "Start selling on ATBP: open My Closet, run a Yard Sale, open a Shop, offer a Service, or sell a digital product. Pick the option that fits.";

export const metadata: Metadata = {
  title: SELL_TITLE,
  description: SELL_DESCRIPTION,
  openGraph: { title: SELL_TITLE, description: SELL_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: SELL_TITLE, description: SELL_DESCRIPTION },
};

export default async function SellPage() {
  const session = await auth();

  if (session?.user) {
    const existingProfile = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
    if (existingProfile?.status === "APPROVED") redirect("/studio");
    if (existingProfile) {
      return (
        <div className="mx-auto max-w-lg px-4 pb-10 pt-8 md:px-6">
          <div className="rounded-card border border-gold-400 bg-gold-100 p-5 text-center">
            <Rocket className="mx-auto mb-2 text-gold-600" />
            <p className="font-bold text-ink-900">Application submitted!</p>
            <p className="mt-1 text-sm text-ink-700">
              {existingProfile.shopName} is pending admin approval. We&apos;ll notify you once you&apos;re approved to start selling.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 pt-8 md:px-6">
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink-900 md:text-3xl">Got something to sell?</h1>
        <p className="mt-2 text-sm text-ink-500">Pick the way that fits what you&apos;re selling. You can always add another later.</p>
      </div>

      {/* ---------- WHY SELL ON ATBP — only real, implemented benefits ---------- */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <WhySellCard icon={Search} title="Buyers looking for unique finds" desc="ATBP is built around Handmade, Pre-Loved, Vintage, and Collectibles (plus Services and Snacks & Pasalubong), not a general everything-store." />
        <WhySellCard icon={Star} title="Your own shop and reviews" desc="A real shop page, ratings from actual buyers, and a seller profile that builds up over time." />
        <WhySellCard icon={Wallet} title="A simple, transparent cut" desc="10% marketplace commission (8% on Premium). No listing fees, no signup cost." />
      </div>

      {/* ---------- HOW IT WORKS ---------- */}
      <div className="mb-8 rounded-2xl border border-ink-100 bg-white p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">How it works</p>
        <ol className="space-y-2.5 text-sm text-ink-700">
          <HowStep n={1}>Create your shop and choose how you want to sell.</HowStep>
          <HowStep n={2}>List your products with real photos, an accurate price, and condition.</HowStep>
          <HowStep n={3}>Buyers discover you through Explore, search, and categories.</HowStep>
          <HowStep n={4}>Make a sale and get notified.</HowStep>
          <HowStep n={5}>Fulfil the order, and your proceeds land in Seller Studio for payout.</HowStep>
        </ol>
      </div>

      {!session?.user ? (
        <div className="rounded-card border border-ink-100 bg-white p-5 text-center">
          <p className="text-sm text-ink-600">Please log in or create an account to start selling.</p>
          <a href="/login?callbackUrl=/sell" className="mt-3 inline-block font-bold text-brand-600 hover:underline">
            Log in to continue →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <SellOption
            href="/sell/closet"
            icon={Shirt}
            title="My Closet"
            subtitle="Sell things you already own."
            detail="Ongoing, low-friction resale: clothes, gadgets, collectibles, whatever you're letting go of. Up to 20 active items."
          />
          <SellOption
            href="/sell/yard-sale"
            icon={Tent}
            title="My Yard Sale"
            subtitle="Clear out a bunch of things at once."
            detail="A time-boxed event, 1 day to 1 month. Closes automatically when it ends."
          />
          <SellOption
            href="/sell/shop"
            icon={Store}
            title="My Shop"
            subtitle="Sell regularly and build a business."
            detail="A real ongoing storefront. Requires BIR verification. Subject to admin review."
          />
          {SERVICES_ENABLED && (
            <SellOption
              href="/sell/service"
              icon={Handshake}
              title="Offer a Service"
              subtitle="Design, writing, tutoring, editing: custom online work."
              detail="Fixed-price packages, delivered digitally. Payment held in escrow until you accept. Up to 20 active listings."
            />
          )}
          {DIGITAL_PRODUCTS_ENABLED && (
            <SellOption
              href="/sell/digital-product"
              icon={Download}
              title="Sell a Digital Product"
              subtitle="Templates, presets, ebooks, STL files: instant download."
              detail="Upload once, sell forever. Buyers download instantly after payment. Up to 20 active listings."
            />
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-ink-400">
        10% marketplace commission (8% on Premium). Card and Online Banking orders also have a flat ₱15 processing fee per order, charged to the seller.{" "}
        <Link href="/pricing" className="font-semibold text-brand-600 hover:underline">See full seller pricing</Link>.
      </p>
    </div>
  );
}

function WhySellCard({ icon: Icon, title, desc }: { icon: typeof Search; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 text-left">
      <Icon size={18} className="text-brand-600" />
      <p className="mt-2 text-sm font-bold text-ink-900">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{desc}</p>
    </div>
  );
}

function HowStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">{n}</span>
      <span>{children}</span>
    </li>
  );
}

function SellOption({
  href, icon: Icon, title, subtitle, detail,
}: { href: string; icon: typeof Store; title: string; subtitle: string; detail: string }) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 transition-colors hover:border-brand-400 hover:bg-brand-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
        <Icon size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink-900">{title}</p>
        <p className="text-sm text-ink-600">{subtitle}</p>
        <p className="mt-1 text-xs text-ink-400">{detail}</p>
      </div>
      <ArrowRight size={16} className="mt-2 shrink-0 text-ink-300" />
    </Link>
  );
}
