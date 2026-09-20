import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuctionCheckoutClient } from "./auction-checkout-client";

export const dynamic = "force-dynamic";

export default async function AuctionCheckoutPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/bids/${productId}/checkout`);

  const product = await prisma.product.findUnique({ where: { id: productId }, include: { seller: true, auction: true } });
  if (!product?.auction) notFound();
  if (product.auction.status !== "ENDED" || product.auction.winnerUserId !== session.user.id) {
    redirect("/bids");
  }
  if (product.auction.purchasedAt) redirect("/orders");

  const address = await prisma.address.findFirst({ where: { userId: session.user.id }, orderBy: { isDefault: "desc" } });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6">
      <h1 className="mb-5 text-2xl font-extrabold text-ink-900">Complete Your Winning Bid</h1>
      <AuctionCheckoutClient
        productId={product.id}
        item={{
          title: product.title,
          image: (product.images as string[])[0],
          amount: product.auction.currentBid,
          seller: product.seller.shopName,
        }}
        defaultShipping={{
          name: address?.fullName ?? user?.name ?? "",
          phone: address?.phone ?? user?.phone ?? "",
          address: address?.line1 ?? "",
          city: address?.city ?? "",
          province: address?.province ?? "",
          postalCode: address?.postalCode ?? "",
        }}
      />
    </div>
  );
}
