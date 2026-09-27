import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/domain/empty-state";
import { PushToggle } from "@/components/domain/push-toggle";
import { NotificationsList } from "./notifications-list";
import { LocalNotificationPrefs } from "./local-notification-prefs";
import { WishlistNotificationPrefs } from "./wishlist-notification-prefs";

// Private page: give it its own tab title (and keep it out of search results).
export const metadata = { title: "Notifications", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/notifications");

  const [notifications, user] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:px-6">
      <h1 className="mb-5 text-2xl font-extrabold text-ink-900">Notifications</h1>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="We'll let you know about new drops, order updates, and sellers you follow." />
      ) : (
        <NotificationsList
          notifications={notifications.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            linkUrl: n.linkUrl,
            read: n.read,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
      )}

      <p className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-ink-400">Settings</p>
      <div className="mb-5">
        <PushToggle />
      </div>
      <WishlistNotificationPrefs
        initial={{
          notifyWishlistPriceDrop: user?.notifyWishlistPriceDrop ?? true,
          notifyWishlistRestock: user?.notifyWishlistRestock ?? true,
          notifyWishlistLowStock: user?.notifyWishlistLowStock ?? true,
        }}
      />
      <LocalNotificationPrefs
        initial={{
          notifyLocalDrops: user?.notifyLocalDrops ?? true,
          notifyLocalEvents: user?.notifyLocalEvents ?? true,
          notifyNearbySellers: user?.notifyNearbySellers ?? true,
        }}
      />
    </div>
  );
}
