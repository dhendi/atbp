import { prisma } from "@/lib/prisma";
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { SELLER_BADGES } from "@/lib/constants";
import { AdminSearch } from "@/components/domain/admin-search";
import { VerificationRow } from "./verification-row";

export const dynamic = "force-dynamic";

export default async function AdminVerificationPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim().slice(0, 100) ?? "";
  const sellers = await prisma.sellerProfile.findMany({
    where: {
      status: "APPROVED",
      ...(query ? { OR: [{ shopName: { contains: query, mode: "insensitive" } }, { handle: { contains: query, mode: "insensitive" } }, { user: { email: { contains: query, mode: "insensitive" } } }] } : {}),
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-2xl font-extrabold text-ink-900">Verification</h1>
      </div>
      <p className="mb-6 text-sm text-ink-500">
        Award badges carefully: they tell buyers ATBP has actually checked something. Never mark a seller Authenticated unless items were verified.
      </p>

      <AdminSearch action="/admin/verification" query={query} placeholder="Search shop, handle or email" />

      {sellers.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={query ? "No matching sellers" : "No approved sellers yet"} />
      ) : (
        <div className="space-y-2">
          {sellers.map((s) => (
            <VerificationRow
              key={s.id}
              sellerId={s.id}
              shopName={s.shopName}
              email={s.user.email}
              badges={s.badges as string[]}
              options={SELLER_BADGES}
            />
          ))}
        </div>
      )}
    </div>
  );
}
