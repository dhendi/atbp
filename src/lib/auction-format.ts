// Special auction formats, computed from the same startingBid/startAt/endAt
// every auction already has — no extra flags for a seller to toggle (and
// nothing for them to fake).

interface AuctionFormatFields {
  startingBid: number;
  startAt: Date | string;
  endAt: Date | string;
}

/** "Piso Start" — a Filipino marketplace tradition: bidding opens at just ₱1. */
export function isPisoFind(auction: AuctionFormatFields): boolean {
  return auction.startingBid <= 1;
}

const RAPID_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/** "Rapid Auction" — a short, high-energy window rather than a multi-day listing. */
export function isRapidAuction(auction: AuctionFormatFields): boolean {
  const duration = new Date(auction.endAt).getTime() - new Date(auction.startAt).getTime();
  return duration > 0 && duration <= RAPID_THRESHOLD_MS;
}
