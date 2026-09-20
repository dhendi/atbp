import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudioSidebar } from "@/components/layout/studio-sidebar";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/studio");

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) redirect("/sell");

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50 md:flex-row">
      <StudioSidebar birVerified={seller.birVerified} />
      <div className="min-w-0 flex-1 pb-16 md:pb-0">
        {seller.status === "PENDING" && (
          <div className="bg-gold-100 px-4 py-2.5 text-center text-sm font-semibold text-gold-600">
            Your shop is pending admin approval. You can set things up, but products and livestreams stay hidden until approved.
          </div>
        )}
        {seller.status === "SUSPENDED" && (
          <div className="bg-live-100 px-4 py-2.5 text-center text-sm font-semibold text-live-600">
            Your shop has been suspended. Contact support for more information.
          </div>
        )}
        {seller.status === "CLOSED" && (
          <div className="bg-ink-100 px-4 py-2.5 text-center text-sm font-semibold text-ink-600">
            Your store is closed. Reopen it any time from Settings → Store Status.
          </div>
        )}
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
