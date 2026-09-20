import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Handshake } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { expireStaleOffers } from "@/lib/services/tawad";
import { MyOfferRow } from "./my-offer-row";

export const dynamic = "force-dynamic";

export default async function MyOffersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/offers");

  await expireStaleOffers();

  const offers = await prisma.offer.findMany({
    where: { buyerId: session.user.id },
    include: { product: { select: { id: true, title: true, images: true, price: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">My Tawad Offers</h1>
      <p className="mb-6 text-sm text-ink-500">Offers you&apos;ve made on Closet and Yard Sale items.</p>

      {offers.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No offers yet"
          description="Look for the Tawad badge on Closet and Yard Sale listings to make an offer."
          action={{ href: "/closets", label: "Browse Closets" }}
        />
      ) : (
        <div className="space-y-2">
          {offers.map((o) => (
            <MyOfferRow
              key={o.id}
              offer={{
                id: o.id,
                amount: o.amount,
                counterAmount: o.counterAmount,
                status: o.status,
                reservedUntil: o.reservedUntil?.toISOString() ?? null,
                product: { id: o.product.id, title: o.product.title, image: (o.product.images as string[])[0], listedPrice: o.product.price },
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
