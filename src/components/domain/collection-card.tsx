import Link from "next/link";
import Image from "next/image";

/** Generic discovery tile — a representative image with a title overlaid,
 * used for Featured Interests, ATBP Picks, and seasonal collections alike. */
export function CollectionCard({
  href, title, subtitle, emoji, image,
}: { href: string; title: string; subtitle?: string; emoji?: string; image?: string }) {
  return (
    <Link href={href} className="group relative block h-36 w-40 shrink-0 overflow-hidden rounded-card bg-ink-100 md:h-40 md:w-44">
      {image ? (
        <Image src={image} alt="" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-4xl">{emoji}</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        {emoji && image && <span className="text-lg leading-none">{emoji}</span>}
        <p className="font-display text-sm font-semibold leading-tight">{title}</p>
        {subtitle && <p className="text-[11px] text-white/70">{subtitle}</p>}
      </div>
    </Link>
  );
}
