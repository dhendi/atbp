"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Radio, Gavel, Hand, Package, Truck, CheckCircle2, UserPlus, Tag, Bell, ShoppingBag, Sparkles, CalendarDays, MapPin, Flag, Megaphone, XCircle, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
}

const ICONS: Record<string, typeof Bell> = {
  SELLER_LIVE: Radio,
  AUCTION_STARTING: Gavel,
  AUCTION_ENDING: Gavel,
  AUCTION_WON: Gavel,
  CLAIM_SUCCESS: Hand,
  ORDER_CONFIRMED: Package,
  PAYMENT_RECEIVED: ShoppingBag,
  ORDER_SHIPPED: Truck,
  ORDER_DELIVERED: CheckCircle2,
  NEW_FOLLOWER: UserPlus,
  PRICE_CHANGE: Tag,
  SHOP_ANNOUNCEMENT: Megaphone,
  REMINDER: Bell,
  LOCAL_DROP: Sparkles,
  LOCAL_EVENT: CalendarDays,
  NEARBY_SELLER: MapPin,
  REPORT_UPDATE: Flag,
  PRODUCT_APPROVED: CheckCircle2,
  PRODUCT_REJECTED: Flag,
  ORDER_CANCELLED: XCircle,
  REVIEW_RECEIVED: Star,
};

export function NotificationsList({ notifications }: { notifications: Notif[] }) {
  const [items, setItems] = useState(notifications);
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div>
      {unreadCount > 0 && (
        <div className="mb-3 flex justify-end">
          <Button
            variant="link"
            size="sm"
            onClick={async () => {
              setItems((prev) => prev.map((n) => ({ ...n, read: true })));
              await markAllNotificationsReadAction();
            }}
          >
            Mark all as read
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {items.map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          const content = (
            <div className={cn("flex gap-3 rounded-2xl border p-3.5 transition-colors", n.read ? "border-ink-100 bg-white" : "border-brand-200 bg-brand-50")}>
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", n.read ? "bg-ink-100 text-ink-500" : "bg-brand-500 text-white")}>
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-900">{n.title}</p>
                <p className="text-sm text-ink-600">{n.body}</p>
                <p className="mt-1 text-xs text-ink-400">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
            </div>
          );

          return (
            <Link
              key={n.id}
              href={n.linkUrl ?? "#"}
              onClick={() => {
                if (!n.read) {
                  setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                  markNotificationReadAction(n.id);
                }
              }}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
