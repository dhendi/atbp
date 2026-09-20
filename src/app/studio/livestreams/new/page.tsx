import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LIVESTREAMS_ENABLED } from "@/lib/feature-flags";
import { LivestreamForm } from "../livestream-form";

export default async function NewLivestreamPage() {
  if (!LIVESTREAMS_ENABLED) redirect("/studio/livestreams");

  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  const products = await prisma.product.findMany({ where: { sellerId: seller!.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Schedule a Livestream</h1>
      <LivestreamForm
        products={products.map((p) => ({ id: p.id, title: p.title, price: p.price, sellingModes: p.sellingModes as string[], images: p.images as string[] }))}
      />
    </div>
  );
}
