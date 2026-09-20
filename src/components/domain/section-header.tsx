import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  seeAllHref,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  seeAllHref?: string;
  /** Most call sites are a secondary section on a page that already has its
   * own `<h1>` elsewhere — pass "h1" only where this is genuinely the page's
   * main heading (e.g. a filtered/search-results view with no other h1). */
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-4 flex items-end justify-between px-4 md:px-6">
      <div>
        {eyebrow && (
          <p className="font-tag mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>
        )}
        <Heading className="font-display text-2xl font-semibold tracking-tight text-ink-900 md:text-3xl">{title}</Heading>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {seeAllHref && (
        <Link href={seeAllHref} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink-700 hover:text-brand-600">
          See all <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
