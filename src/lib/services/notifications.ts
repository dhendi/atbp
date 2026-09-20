import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/services/push";

export type NotificationType =
  | "SELLER_LIVE"
  | "AUCTION_STARTING"
  | "AUCTION_ENDING"
  | "AUCTION_WON"
  | "AUCTION_ENDED"
  | "OUTBID"
  | "NEW_MESSAGE"
  | "CLAIM_SUCCESS"
  | "ORDER_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "NEW_FOLLOWER"
  | "PRICE_CHANGE"
  | "LOW_STOCK"
  | "BACK_IN_STOCK"
  | "NEW_LISTING_FROM_FOLLOWED"
  | "NEW_AUCTION_FROM_FOLLOWED"
  | "SHOP_ANNOUNCEMENT"
  | "DROP_LIVE"
  | "REMINDER"
  | "LOCAL_DROP"
  | "LOCAL_EVENT"
  | "NEARBY_SELLER"
  | "REPORT_UPDATE"
  | "ACCOUNT_WARNING"
  | "ACCOUNT_REINSTATED"
  | "STORE_CLOSED"
  | "STORE_REOPENED"
  | "OFFER_RECEIVED"
  | "OFFER_COUNTERED"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "OFFER_EXPIRED"
  | "PLATFORM_ANNOUNCEMENT"
  | "ID_VERIFIED"
  | "ID_REJECTED";

export async function notify(userId: string, type: NotificationType, title: string, body: string, linkUrl?: string) {
  const notification = await prisma.notification.create({ data: { userId, type, title, body, linkUrl } });
  // Every in-app notification also tries to reach the user as a real push
  // notification — best-effort, and never lets a push failure break the
  // primary notification write above.
  sendPushToUser(userId, { title, body, url: linkUrl }).catch(() => {});
  return notification;
}
