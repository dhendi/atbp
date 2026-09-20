import { prisma } from "@/lib/prisma";
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { SELLER_BADGES } from "@/lib/constants";
import { VerificationRow } from "./verification-row";

export const dynamic = "force-dynamic";

export default async function AdminVerificationPage() {
  const sellers = await prisma.sellerProfile.findMany({
    where: { status: "APPROVED" },
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

      {sellers.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No approved sellers yet" />
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
