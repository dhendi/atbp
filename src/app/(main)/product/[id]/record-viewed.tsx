"use client";

import { useEffect } from "react";
import { recordRecentlyViewed } from "@/lib/recently-viewed";

export function RecordViewed(props: { id: string; title: string; price: number; image: string; handle: string; shopName: string }) {
  useEffect(() => {
    recordRecentlyViewed(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);
  return null;
}
