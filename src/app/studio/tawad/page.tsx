import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Handshake } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { expireStaleOffers } from "@/lib/services/tawad";
import { TawadOfferRow } from "./tawad-offer-row";

export const dynamic = "force-dynamic";

export default async function StudioTawadPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });

  await expireStaleOffers();

  const offers = await prisma.offer.findMany({
    where: { sellerId: seller!.id, status: { in: ["PENDING", "COUNTERED", "ACCEPTED"] } },
    include: { product: { select: { id: true, title: true, images: true } }, buyer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Tawad Inbox</h1>
      <p className="mb-6 text-sm text-ink-500">Offers on your Closet and Yard Sale items.</p>

      {offers.length === 0 ? (
        <EmptyState icon={Handshake} title="No offers yet" description="Turn on Tawad from an item in My Closet or My Yard Sale to start receiving offers." />
      ) : (
        <div className="space-y-2">
          {offers.map((o) => (
            <TawadOfferRow
              key={o.id}
              offer={{
                id: o.id,
                amount: o.amount,
                counterAmount: o.counterAmount,
                status: o.status,
                expiresAt: o.expiresAt?.toISOString() ?? null,
                reservedUntil: o.reservedUntil?.toISOString() ?? null,
                product: { id: o.product.id, title: o.product.title, image: (o.product.images as string[])[0] },
                buyerName: o.buyer.name,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
