import { Tags } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { CategoryTagSuggestionActions } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "subtle" | "live" | "outline"> = {
  PENDING: "outline",
  APPROVED: "success",
  REJECTED: "subtle",
};

export default async function AdminCategorySuggestionsPage() {
  const suggestions = await prisma.categoryTagSuggestion.findMany({
    include: { seller: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Category Tags</h1>
      <p className="mb-6 text-sm text-ink-500">
        &quot;Other&quot; categories sellers typed in during onboarding or from Shop Settings. &quot;Approve &amp; Create Category&quot; creates the real
        top-level category in one step; &quot;Approve only&quot; just marks it worth adding later.
      </p>
      {suggestions.length === 0 ? (
        <EmptyState icon={Tags} title="No category tag suggestions" />
      ) : (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{s.tag}</p>
                <p className="text-xs text-ink-500">
                  {s.seller.shopName} · {s.createdAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[s.status] ?? "outline"}>{s.status}</Badge>
              {s.status === "PENDING" && <CategoryTagSuggestionActions suggestionId={s.id} tag={s.tag} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
