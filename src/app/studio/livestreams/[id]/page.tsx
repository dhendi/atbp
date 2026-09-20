import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPeso } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ControlRoomActions } from "./control-room-actions";
import { AddProductToStream } from "./add-product";

export const dynamic = "force-dynamic";

export default async function ControlRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });

  const stream = await prisma.livestream.findFirst({
    where: { id, sellerId: seller!.id },
    include: {
      products: {
        orderBy: { order: "asc" },
        include: { product: true, claimSlots: true, auction: true },
      },
    },
  });
  if (!stream) notFound();

  const queuedProductIds = new Set(stream.products.map((p) => p.productId));
  const availableProducts = await prisma.product.findMany({
    where: { sellerId: seller!.id, status: "ACTIVE", id: { notIn: Array.from(queuedProductIds) } },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">{stream.title}</h1>
          <p className="text-sm text-ink-500">
            <Badge variant={stream.status === "LIVE" ? "live" : "subtle"}>{stream.status}</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          {stream.status === "LIVE" && (
            <Button variant="outline" asChild>
              <Link href={`/live/${stream.id}`} target="_blank">
                <ExternalLink size={15} /> View as buyer
              </Link>
            </Button>
          )}
          <ControlRoomActions streamId={stream.id} status={stream.status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="rounded-card border border-ink-100 bg-white p-4">
          <h2 className="mb-3 font-bold text-ink-900">Product Queue</h2>
          <div className="space-y-2">
            {stream.products.map((lp) => (
              <div key={lp.id} className={`flex items-center gap-3 rounded-xl border p-2.5 ${lp.status === "ACTIVE" ? "border-live-500 bg-live-50" : "border-ink-100"}`}>
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                  <Image src={(lp.product.images as string[])[0]} alt={lp.product.title} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{lp.product.title}</p>
                  <p className="text-xs text-ink-500">
                    {lp.mode.replace("_", " ")} · {formatPeso(lp.product.price)}
                    {lp.mode === "CLAIM" && ` · ${lp.claimSlots.filter((s) => s.status === "AVAILABLE").length}/${lp.claimSlots.length} left`}
                  </p>
                </div>
                {lp.status === "ACTIVE" ? (
                  <Badge variant="live">Featured</Badge>
                ) : lp.status === "ENDED" ? (
                  <Badge variant="subtle">Done</Badge>
                ) : (
                  <ControlRoomActions streamId={stream.id} status={stream.status} featureProductId={lp.id} isLiveStreamActive={stream.status === "LIVE"} />
                )}
              </div>
            ))}
          </div>
        </div>

        <AddProductToStream streamId={stream.id} products={availableProducts.map((p) => ({ id: p.id, title: p.title, sellingModes: p.sellingModes as string[] }))} />
      </div>
    </div>
  );
}
