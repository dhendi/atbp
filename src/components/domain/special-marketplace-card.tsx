import Image from "next/image";
import Link from "next/link";

/** A compact promo tile for a distinct marketplace (Made-to-Order, Food &
 * Snacks, ATBP Services) that doesn't need a full product shelf to stay
 * discoverable from the homepage — still a real, fully browsable page. */
export function SpecialMarketplaceCard({
  href, image, eyebrow, title, subtitle,
}: { href: string; image: string; eyebrow: string; title: string; subtitle: string }) {
  return (
    <Link href={href} className="group relative flex h-28 items-center gap-3 overflow-hidden rounded-card border border-ink-100 bg-white p-3 transition-colors hover:border-ink-200">
      <div className="relative h-full w-20 shrink-0 overflow-hidden rounded-xl bg-ink-100">
        <Image src={image} alt={title} fill className="object-cover transition-transform group-hover:scale-105" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{eyebrow}</p>
        <p className="font-display truncate text-sm font-semibold text-ink-900">{title}</p>
        <p className="line-clamp-2 text-xs text-ink-500">{subtitle}</p>
      </div>
    </Link>
  );
}
