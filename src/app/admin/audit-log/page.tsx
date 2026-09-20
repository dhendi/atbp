import { prisma } from "@/lib/prisma";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage() {
  const logs = await prisma.adminAuditLog.findMany({
    include: { admin: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Audit Log</h1>
      <p className="mb-6 text-sm text-ink-500">Every admin action, most recent first. Last 200 entries.</p>
      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No admin actions yet" description="Actions taken by admins across the platform will show up here." />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-card border border-ink-100 bg-white p-3.5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">{log.action.replace(/_/g, " ")}</p>
                <span className="text-xs text-ink-400">{timeAgo(log.createdAt)}</span>
              </div>
              <p className="text-xs text-ink-500">
                {log.admin.name} ({log.admin.email}) · {log.targetType} {log.targetId}
              </p>
              {log.details !== null && (
                <pre className="mt-1.5 overflow-x-auto rounded-xl bg-ink-50 p-2 text-[11px] text-ink-600">
                  {JSON.stringify(log.details)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
