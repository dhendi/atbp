import Link from "next/link";
import Image from "next/image";
import { Tag, Plus, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { formatPeso } from "@/lib/utils";
import { isDealActive, isDealScheduled, discountPercent } from "@/lib/deals";

export const dynamic = "force-dynamic";

export default async function StudioDealsPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });

  const products = await prisma.product.findMany({
    where: { sellerId: seller!.id, dealPrice: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">Deals</h1>
        <Button variant="brand" asChild>
          <Link href="/studio/products"><Plus size={16} /> Schedule a deal</Link>
        </Button>
      </div>
      <p className="mb-6 text-sm text-ink-500">Add or edit a deal from a product&apos;s edit page; this view shows everything currently scheduled.</p>

      {products.length === 0 ? (
        <EmptyState icon={Tag} title="No deals scheduled" description="Edit any fixed-price product to add a sale price and a start/end window." />
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const active = isDealActive(p);
            const scheduled = isDealScheduled(p);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-card border border-ink-100 bg-white p-3.5">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                  <Image src={(p.images as string[])[0]} alt={p.title} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{p.title}</p>
                  <p className="text-xs text-ink-500">
                    {formatPeso(p.dealPrice!)} <span className="line-through">{formatPeso(p.price)}</span> · {discountPercent(p)}% off
                  </p>
                </div>
                <Badge variant={active ? "success" : scheduled ? "brand" : "subtle"}>
                  {active ? "Active" : scheduled ? "Scheduled" : "Ended"}
                </Badge>
                <Button size="icon" variant="ghost" asChild>
                  <Link href={`/studio/products/${p.id}/edit`} aria-label={`Edit ${p.title}`}><Pencil size={15} /></Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
