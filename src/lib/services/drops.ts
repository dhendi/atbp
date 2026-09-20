import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";

/** Lazily transitions UPCOMING drops past their release time to LIVE and notifies
 *  reminder-holders plus the seller's followers — same opportunistic-settle
 *  pattern as settleExpiredAuctions, called from pages rather than a cron job. */
export async function activateScheduledDrops() {
  const due = await prisma.drop.findMany({
    where: { status: "UPCOMING", releaseAt: { lte: new Date() } },
    include: { seller: true, reminders: true },
  });

  for (const drop of due) {
    await prisma.drop.update({ where: { id: drop.id }, data: { status: "LIVE", liveNotifiedAt: new Date() } });

    const followers = await prisma.follow.findMany({ where: { sellerId: drop.sellerId, notifyNewProducts: true } });
    const notifiedUserIds = new Set<string>();

    for (const reminder of drop.reminders) {
      if (notifiedUserIds.has(reminder.userId)) continue;
      notifiedUserIds.add(reminder.userId);
      await notify(reminder.userId, "DROP_LIVE", `${drop.name} is live`, `${drop.seller.shopName}'s "${drop.name}" just went live.`, `/drops/${drop.id}`);
    }
    for (const follow of followers) {
      if (notifiedUserIds.has(follow.followerId)) continue;
      notifiedUserIds.add(follow.followerId);
      await notify(follow.followerId, "DROP_LIVE", `${drop.name} is live`, `${drop.seller.shopName}'s "${drop.name}" just went live.`, `/drops/${drop.id}`);
    }

    // Also surface it to buyers in the same area who aren't already covered
    // above and have local-drop notifications on — capped for a demo app.
    if (drop.seller.province) {
      const nearby = await prisma.user.findMany({
        where: { area: drop.seller.province, notifyLocalDrops: true, id: { notIn: [...notifiedUserIds] } },
        take: 100,
      });
      for (const user of nearby) {
        await notify(user.id, "LOCAL_DROP", `${drop.name} just went live near you`, `${drop.seller.shopName} in ${drop.seller.province} just dropped "${drop.name}".`, `/drops/${drop.id}`);
      }
    }
  }

  return due.length;
}
