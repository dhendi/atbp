import { prisma } from "@/lib/prisma";

/** Forces every existing session for this user to be rejected on its next
 * request (see the jwt callback in lib/auth.config.ts) — used wherever an
 * admin action means an existing login should no longer be trusted. */
export async function revokeSessions(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
}
