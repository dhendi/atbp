import type { Metadata } from "next";
import { cachedQuery } from "@/lib/cache";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { activateScheduledDrops } from "@/lib/services/drops";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { DropCard } from "@/components/domain/drop-card";

export const dynamic = "force-dynamic";

// Same list for every visitor — cache it, even though the page itself stays
// dynamic for the per-user reminder overlay below.
const getActiveDrops = cachedQuery(
  async () => {
    await activateScheduledDrops();
    return prisma.drop.findMany({
      where: { status: { in: ["UPCOMING", "LIVE"] } },
      include: { seller: true, products: true },
      orderBy: { releaseAt: "asc" },
    });
  },
  ["active-drops"],
  { revalidate: 60, tags: ["drops"] }
);

const DROPS_TITLE = "Drops";
const DROPS_DESCRIPTION =
  "Browse limited, small-batch drops from Filipino makers on ATBP. Set a reminder so you don't miss a release before it sells out.";

export const metadata: Metadata = {
  title: DROPS_TITLE,
  description: DROPS_DESCRIPTION,
  openGraph: { title: DROPS_TITLE, description: DROPS_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: DROPS_TITLE, description: DROPS_DESCRIPTION },
};

export default async function DropsPage() {
  const session = await auth();
  const drops = await getActiveDrops();

  const myReminders = session?.user
    ? await prisma.dropReminder.findMany({ where: { userId: session.user.id, dropId: { in: drops.map((d) => d.id) } } })
    : [];
  const remindedIds = new Set(myReminders.map((r) => r.dropId));

  return (
    <div className="space-y-4 pt-4 md:pt-6">
      <SectionHeader as="h1"
        eyebrow="Limited & timed"
        title="Drops"
        subtitle="Small-batch releases from Filipino makers. Once they're gone, they're gone."
      />
      <div className="px-4 md:px-6">
        {drops.length === 0 ? (
          <EmptyState icon={Sparkles} title="No drops scheduled" description="Check back soon. Sellers announce new drops regularly." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {drops.map((d) => (
              <DropCard
                key={d.id}
                drop={{
                  id: d.id,
                  name: d.name,
                  coverImage: d.coverImage,
                  releaseAt: d.releaseAt.toISOString(),
                  seller: { shopName: d.seller.shopName, handle: d.seller.handle },
                  quantityAvailable: d.products.reduce((sum, p) => sum + p.quantityAvailable, 0),
                }}
                isReminded={remindedIds.has(d.id)}
                loggedIn={!!session?.user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
