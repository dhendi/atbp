import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContactForm } from "./contact-form";

// Title kept as just the label ("Contact Support"), not the old hand-appended
// "Contact Support | ATBP": the root layout's title template now appends
// " | ATBP" itself, so a literal "| ATBP" baked in here would double up.
const CONTACT_TITLE = "Contact Support";
const CONTACT_DESCRIPTION =
  "Contact ATBP support for help with an order, payment, account, or listing. Attach a recent order to your message for faster help from our team.";

export const metadata: Metadata = {
  title: CONTACT_TITLE,
  description: CONTACT_DESCRIPTION,
  openGraph: { title: CONTACT_TITLE, description: CONTACT_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: CONTACT_TITLE, description: CONTACT_DESCRIPTION },
};
export const dynamic = "force-dynamic";

export default async function ContactSupportPage() {
  const session = await auth();
  const orders = session?.user
    ? await prisma.order.findMany({
        where: { buyerId: session.user.id },
        select: { id: true, orderNumber: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-8 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Contact Support</h1>
      <p className="mt-2 text-sm text-ink-500">Tell us what&apos;s going on and we&apos;ll get back to you as soon as we can.</p>

      <ContactForm
        defaultName={session?.user?.name ?? ""}
        defaultEmail={session?.user?.email ?? ""}
        orders={orders.map((o) => ({ id: o.id, label: `${o.orderNumber} · ${o.createdAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}` }))}
      />
    </div>
  );
}
