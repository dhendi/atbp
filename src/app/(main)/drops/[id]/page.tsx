import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPeso } from "@/lib/utils";
import { productTypeLabel } from "@/lib/constants";
import { activateScheduledDrops } from "@/lib/services/drops";
import { DateCountdownLabel } from "@/components/domain/countdown";
import { SellerBadgeRow } from "@/components/domain/verified-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropFollowButton } from "./drop-follow-button";
import { DropReminderButton } from "./drop-reminder-button";
import { AddToCollectionButton } from "@/components/domain/add-to-collection-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const drop = await prisma.drop.findUnique({ where: { id }, include: { seller: true } });
  if (!drop) return { title: "Drop not found" };

  const title = `${drop.name} by ${drop.seller.shopName}`;
  const description = drop.description?.slice(0, 160) ?? `${drop.name}, a limited drop by ${drop.seller.shopName} on ATBP.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: drop.coverImage ? [{ url: drop.coverImage }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: drop.coverImage ? [drop.coverImage] : undefined,
    },
  };
}

export default async function DropDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  await activateScheduledDrops();

  const drop = await prisma.drop.findUnique({
    where: { id },
    include: { seller: true, products: { include: { product: true }, orderBy: { order: "asc" } } },
  });
  if (!drop) notFound();

  const isLive = new Date(drop.releaseAt) <= new Date();
  const isFollowing = session?.user
    ? !!(await prisma.follow.findUnique({ where: { followerId_sellerId: { followerId: session.user.id, sellerId: drop.sellerId } } }))
    : false;
  const isReminded = session?.user
    ? !!(await prisma.dropReminder.findUnique({ where: { dropId_userId: { dropId: drop.id, userId: session.user.id } } }))
    : false;

  return (
    <div className="pb-10">
      <div className="relative h-64 w-full bg-ink-200 md:h-80">
        <Image src={drop.coverImage} alt={drop.name} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-6">
          <div className="price-tag inline-block bg-white/95 px-3 py-1.5">
            <span className="font-tag text-xs font-bold text-ink-900">
              {isLive ? "Live now" : <>Drops <DateCountdownLabel target={drop.releaseAt.toISOString()} /></>}
            </span>
          </div>
          <h1 className="font-display mt-2 text-2xl font-semibold md:text-4xl">{drop.name}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-5 md:px-6">
        {drop.description && <p className="text-sm leading-relaxed text-ink-700">{drop.description}</p>}

        <div className="relative mt-4 flex items-center gap-3 rounded-2xl border border-ink-200 p-3">
          <Link href={`/seller/${drop.seller.handle}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
            <Avatar>
              <AvatarImage src={drop.seller.logoUrl ?? undefined} />
              <AvatarFallback>{drop.seller.shopName[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink-900">{drop.seller.shopName}</p>
              {drop.seller.province && (
                <p className="flex items-center gap-1 text-xs text-ink-500"><MapPin size={11} /> {drop.seller.province}</p>
              )}
              <SellerBadgeRow badges={drop.seller.badges as string[]} verified={drop.seller.verified} className="mt-1" />
            </div>
          </Link>
          <div className="flex shrink-0 gap-2">
            {!isLive && <DropReminderButton dropId={drop.id} isReminded={isReminded} loggedIn={!!session?.user} />}
            <AddToCollectionButton item={{ dropId: drop.id }} iconOnly />
            <DropFollowButton sellerId={drop.sellerId} isFollowing={isFollowing} isLive={isLive} />
          </div>
        </div>

        <h2 className="font-display mt-8 mb-3 text-lg font-semibold text-ink-900">
          What&apos;s in this drop ({drop.products.length})
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {drop.products.map((dp) => (
            <Link key={dp.id} href={isLive ? `/product/${dp.product.id}` : "#"} className="block">
              <div className="relative aspect-square overflow-hidden rounded-card bg-ink-100">
                <Image src={(dp.product.images as string[])[0]} alt={dp.product.title} fill className="object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase text-ink-800">
                  {productTypeLabel(dp.product.type)}
                </span>
                {!isLive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink-900/50">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase text-ink-900">Not yet open</span>
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-ink-900">{dp.product.title}</p>
              <div className="flex items-center justify-between">
                <span className="font-tag text-sm font-bold text-ink-900">{formatPeso(dp.product.price)}</span>
                <span className="flex items-center gap-1 text-xs text-ink-500"><Package size={11} /> {dp.quantityAvailable}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
