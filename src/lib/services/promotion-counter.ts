import { prisma } from "@/lib/prisma";

export interface SlotAvailability {
  claimed: number;
  limit: number;
  remaining: number;
  full: boolean;
}

export async function getSlotAvailability(campaignId: string, fallbackLimit: number): Promise<SlotAvailability> {
  const counter = await prisma.promotionCounter.findUnique({ where: { id: campaignId } });
  const claimed = counter?.count ?? 0;
  const limit = counter?.limit ?? fallbackLimit;
  return { claimed, limit, remaining: Math.max(0, limit - claimed), full: claimed >= limit };
}

/**
 * Atomically reserves the next numbered slot in a capped campaign, or returns
 * null once it's full. A single `UPDATE ... RETURNING` is enough for
 * correctness — Postgres row-locks the counter for the statement's duration,
 * so two concurrent callers can never both read `count < limit` and both win
 * the same number. Reusable for any future "first N sellers/buyers get X"
 * campaign — just give it a different campaignId.
 */
export async function claimSlot(campaignId: string): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    UPDATE "PromotionCounter"
    SET count = count + 1, "updatedAt" = now()
    WHERE id = ${campaignId} AND count < "limit"
    RETURNING count
  `;
  return rows.length > 0 ? rows[0].count : null;
}
