import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { FolderHeart, Lock, Globe } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { NewCollectionDialog } from "./new-collection-dialog";

export const dynamic = "force-dynamic";

const COLLECTIONS_TITLE = "Collections";
const COLLECTIONS_DESCRIPTION = "Save products, shops, and drops into named boards on ATBP, and share the ones you make public.";

export const metadata: Metadata = {
  title: COLLECTIONS_TITLE,
  description: COLLECTIONS_DESCRIPTION,
  openGraph: { title: COLLECTIONS_TITLE, description: COLLECTIONS_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: COLLECTIONS_TITLE, description: COLLECTIONS_DESCRIPTION },
};

export default async function CollectionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/collections");

  const collections = await prisma.userCollection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        take: 4,
        orderBy: { createdAt: "desc" },
        include: { product: { select: { images: true } }, seller: { select: { logoUrl: true } }, drop: { select: { coverImage: true } } },
      },
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6">
        <SectionHeader as="h1" eyebrow="Yours" title="Collections" subtitle="Boards you've saved products, shops, and drops into" />
        <NewCollectionDialog />
      </div>

      <div className="px-4 md:px-6">
        {collections.length === 0 ? (
          <EmptyState
            icon={FolderHeart}
            title="No collections yet"
            description="Save products, shops, or drops into a named board. Start one from any product page."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {collections.map((c) => {
              const images = c.items
                .map((i) => i.product?.images && (i.product.images as string[])[0] ? (i.product.images as string[])[0] : i.seller?.logoUrl ?? i.drop?.coverImage)
                .filter((img): img is string => !!img);
              return (
                <Link key={c.id} href={`/collections/${c.id}`} className="block rounded-card border border-ink-200 bg-white p-3 hover:border-brand-300">
                  <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-xl bg-ink-100" style={{ aspectRatio: "1/1" }}>
                    {images.length > 0 ? (
                      images.slice(0, 4).map((img, i) => (
                        <div key={i} className="relative bg-ink-100">
                          <Image src={img} alt="" fill className="object-cover" />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 row-span-2 flex items-center justify-center text-ink-300">
                        <FolderHeart size={28} />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-bold text-ink-900">{c.name}</p>
                  <p className="flex items-center gap-1 text-xs text-ink-500">
                    {c.isPublic ? <Globe size={11} /> : <Lock size={11} />}
                    {c._count.items} {c._count.items === 1 ? "item" : "items"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
