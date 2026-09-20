import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Tent } from "lucide-react";
import { getLeafCategories } from "@/lib/categories";
import { getActiveYardSale } from "@/lib/services/yard-sale";
import { StartYardSalePrompt } from "./start-yard-sale-prompt";
import { YardSaleItemsPanel } from "./yard-sale-items-panel";

export const dynamic = "force-dynamic";

export default async function StudioYardSalePage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  const yardSale = await getActiveYardSale(seller!.id);

  if (!yardSale) {
    return (
      <div className="max-w-md">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Tent size={22} />
        </div>
        <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Start My Yard Sale</h1>
        <p className="mb-6 text-sm text-ink-500">A time-boxed clear-out: 1 day up to 1 month.</p>
        <StartYardSalePrompt defaultCity={seller!.province ?? ""} defaultTitle={`${seller!.shopName}'s Yard Sale`} />
      </div>
    );
  }

  const [items, leafCategories] = await Promise.all([
    prisma.product.findMany({ where: { yardSaleId: yardSale.id, status: { not: "REMOVED" } }, orderBy: { createdAt: "desc" } }),
    getLeafCategories(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">{yardSale.title}</h1>
        <p className="text-sm text-ink-500">
          {yardSale.city ?? "N/A"} · {items.filter((i) => i.status === "ACTIVE").length} items ·{" "}
          {yardSale.startDate.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} –{" "}
          {yardSale.endDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <YardSaleItemsPanel
        yardSaleId={yardSale.id}
        items={items.map((i) => ({
          id: i.id, title: i.title, images: i.images as string[], price: i.price, condition: i.condition, status: i.status,
          tawadEnabled: i.tawadEnabled, tawadFloor: i.tawadFloor, tawadCeiling: i.tawadCeiling,
        }))}
        categories={leafCategories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
        defaultCity={yardSale.city ?? ""}
      />
    </div>
  );
}
