import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>
) {
  await prisma.adminAuditLog.create({
    data: { adminId, action, targetType, targetId, details: (details ?? undefined) as Prisma.InputJsonValue | undefined },
  });
}
