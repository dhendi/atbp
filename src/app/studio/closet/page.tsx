import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shirt } from "lucide-react";
import { getLeafCategories } from "@/lib/categories";
import { checkClosetStaleness } from "@/lib/services/closet";
import { OpenClosetPrompt } from "./open-closet-prompt";
import { ClosetDetailsForm } from "./closet-details-form";
import { ClosetItemsPanel } from "./closet-items-panel";

export const dynamic = "force-dynamic";

export default async function StudioClosetPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  const closet = await prisma.closet.findUnique({ where: { sellerId: seller!.id } });

  if (!closet) {
    return (
      <div className="max-w-md">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Shirt size={22} />
        </div>
        <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Open My Closet</h1>
        <p className="mb-6 text-sm text-ink-500">Sell things you already own: up to 20 active items, no subscription.</p>
        <OpenClosetPrompt defaultCity={seller!.province ?? ""} />
      </div>
    );
  }

  await checkClosetStaleness(closet.id);

  const [items, leafCategories] = await Promise.all([
    prisma.product.findMany({ where: { closetId: closet.id, status: { not: "REMOVED" } }, orderBy: { createdAt: "desc" } }),
    getLeafCategories(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">{closet.title}</h1>
        <p className="text-sm text-ink-500">{items.filter((i) => i.status === "ACTIVE").length} of 20 active items</p>
      </div>

      <ClosetDetailsForm initial={{ title: closet.title, city: closet.city ?? "", description: closet.description ?? "" }} />

      <ClosetItemsPanel
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          images: i.images as string[],
          price: i.price,
          condition: i.condition,
          status: i.status,
          closetConfirmedAt: i.closetConfirmedAt?.toISOString() ?? null,
          staleNudgeSentAt: i.staleNudgeSentAt?.toISOString() ?? null,
          tawadEnabled: i.tawadEnabled,
          tawadFloor: i.tawadFloor,
          tawadCeiling: i.tawadCeiling,
        }))}
        categories={leafCategories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
        defaultCity={closet.city ?? ""}
      />
    </div>
  );
}
