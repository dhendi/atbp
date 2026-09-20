import { prisma } from "@/lib/prisma";

/** Returns true and records the attempt if under the limit; returns false
 * (and records nothing) once `key` has hit `max` attempts within `windowMs`. */
export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const count = await prisma.rateLimitEvent.count({
    where: { key, createdAt: { gte: new Date(Date.now() - windowMs) } },
  });
  if (count >= max) return false;
  await prisma.rateLimitEvent.create({ data: { key } });
  return true;
}
