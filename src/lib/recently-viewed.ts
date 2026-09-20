"use client";

const KEY = "atbp_recently_viewed";
const MAX = 12;

export interface RecentlyViewedItem {
  id: string;
  title: string;
  price: number;
  image: string;
  handle: string;
  shopName: string;
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(item: RecentlyViewedItem) {
  try {
    const current = getRecentlyViewed().filter((i) => i.id !== item.id);
    const next = [item, ...current].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — recently viewed is a soft convenience, safe to skip.
  }
}
