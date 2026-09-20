"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { savePushSubscriptionAction, removePushSubscriptionAction } from "@/lib/actions/push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Feature detection needs the browser's navigator/window, which isn't available
  // during SSR — this has to run after mount rather than during render.
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      setSubscribed(!!existing);
    }).catch(() => {});
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications permission was denied.");
        return;
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        toast.error("Push isn't configured on this deployment.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await savePushSubscriptionAction(json);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setSubscribed(true);
      toast.success("Push notifications enabled!");
    } catch {
      toast.error("Couldn't enable push notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Push notifications turned off.");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-ink-200 bg-white p-3.5">
      <div className="flex items-center gap-2.5">
        {subscribed ? <Bell size={17} className="text-brand-600" /> : <BellOff size={17} className="text-ink-400" />}
        <div>
          <p className="text-sm font-bold text-ink-900">Push notifications</p>
          <p className="text-xs text-ink-500">{subscribed ? "On for this device" : "Get outbid alerts and order updates instantly"}</p>
        </div>
      </div>
      <Button size="sm" variant={subscribed ? "subtle" : "brand"} disabled={loading} onClick={subscribed ? disable : enable}>
        {subscribed ? "Turn off" : "Enable"}
      </Button>
    </div>
  );
}
