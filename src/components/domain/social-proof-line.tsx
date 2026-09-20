import { Zap, Flame, ShoppingCart } from "lucide-react";
import type { SocialProofData } from "@/lib/services/social-proof";

/** Renders at most `max` of the strongest honest signals available — never all
 * of them at once, so cards stay calm. Low stock (most actionable) wins first,
 * then today's sales, then cart adds. Nothing renders if there's no real signal. */
export function SocialProofLine({ data, max = 1, className }: { data?: SocialProofData; max?: number; className?: string }) {
  if (!data) return null;
  const lines: { key: string; node: React.ReactNode; urgent?: boolean }[] = [];
  if (data.lowStock) {
    lines.push({ key: "low-stock", urgent: true, node: <><Zap size={11} /> Only {data.lowStock} left</> });
  }
  if (data.soldToday) {
    lines.push({ key: "sold-today", node: <><Flame size={11} /> {data.soldToday} sold today</> });
  }
  if (data.cartCount) {
    lines.push({ key: "cart-count", node: <><ShoppingCart size={11} /> {data.cartCount} in carts</> });
  }
  const shown = lines.slice(0, max);
  if (shown.length === 0) return null;
  return (
    <div className={className ?? "flex flex-wrap gap-x-2.5 gap-y-1"}>
      {shown.map((l) => (
        <span key={l.key} className={l.urgent ? "flex items-center gap-1 text-[11px] font-bold text-live-600" : "flex items-center gap-1 text-[11px] font-semibold text-ink-500"}>
          {l.node}
        </span>
      ))}
    </div>
  );
}
