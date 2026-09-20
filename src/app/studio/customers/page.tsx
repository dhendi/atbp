import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChevronRight, Users } from "lucide-react";
import { EmptyState } from "@/components/domain/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPeso, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await auth();
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session!.user.id } });
  const orders = await prisma.order.findMany({ where: { sellerId: seller!.id }, include: { buyer: true } });

  const byBuyer = new Map<string, { id: string; name: string; avatarUrl: string | null; orders: number; total: number; isGuest: boolean }>();
  for (const o of orders) {
    // A guest has no stable buyerId — group repeat guest purchases by email instead.
    const key = o.buyerId ?? o.guestEmail ?? o.id;
    const existing = byBuyer.get(key) ?? {
      id: key,
      name: o.buyer?.name ?? `${o.guestEmail} (guest)`,
      avatarUrl: o.buyer?.avatarUrl ?? null,
      orders: 0, total: 0,
      isGuest: !o.buyerId,
    };
    existing.orders += 1;
    existing.total += o.total;
    byBuyer.set(key, existing);
  }
  const customers = Array.from(byBuyer.values()).sort((a, b) => b.total - a.total);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Customers</h1>
      {customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" />
      ) : (
        <div className="space-y-2">
          {customers.map((c) => {
            // Guest customers have no account to open a detail page for.
            const content = (
              <>
                <Avatar>
                  <AvatarImage src={c.avatarUrl ?? undefined} />
                  <AvatarFallback>{initials(c.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{c.name}</p>
                  <p className="text-xs text-ink-500">{c.orders} order{c.orders !== 1 ? "s" : ""}</p>
                </div>
                <span className="font-bold text-ink-900">{formatPeso(c.total)}</span>
                {!c.isGuest && <ChevronRight size={16} className="text-ink-300" />}
              </>
            );
            return c.isGuest ? (
              <div key={c.id} className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3">
                {content}
              </div>
            ) : (
              <Link
                key={c.id}
                href={`/studio/customers/${c.id}`}
                className="flex items-center gap-3 rounded-card border border-ink-100 bg-white p-3 hover:bg-ink-50"
              >
                {content}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
