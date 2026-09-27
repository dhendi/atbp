import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { AddressList } from "./address-list";
import { AddAddressForm } from "./add-address-form";

// Private page: give it its own tab title (and keep it out of search results).
export const metadata = { title: "Addresses", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/addresses");

  const addresses = await prisma.address.findMany({ where: { userId: session.user.id }, orderBy: { isDefault: "desc" } });

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pt-4 pb-10 md:px-6 md:pt-6">
      <SectionHeader as="h1" eyebrow="Shipping" title="Addresses" subtitle="Where your finds get delivered" />

      <div className="px-0">
        {addresses.length === 0 ? (
          <EmptyState icon={MapPin} title="No addresses yet" description="Add one below so checkout goes faster next time." />
        ) : (
          <AddressList addresses={addresses} />
        )}
      </div>

      <div className="rounded-card border border-ink-200 bg-white p-4">
        <h2 className="mb-3 font-bold text-ink-900">Add a new address</h2>
        <AddAddressForm />
      </div>
    </div>
  );
}
