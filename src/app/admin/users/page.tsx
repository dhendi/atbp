import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { UserModerationActions } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_VARIANT: Record<string, "brand" | "gold" | "live" | "subtle"> = {
  ADMIN: "gold",
  SELLER: "brand",
  BUYER: "subtle",
  SUSPENDED: "live",
};

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Users</h1>
      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users" />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{u.name}</p>
                <p className="text-xs text-ink-500">@{u.username} · {u.email}</p>
              </div>
              <Badge variant={ROLE_VARIANT[u.role] ?? "subtle"}>{u.role}</Badge>
              {u.role !== "ADMIN" && <UserModerationActions userId={u.id} suspended={u.role === "SUSPENDED"} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
