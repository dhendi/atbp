import Link from "next/link";

export function CategoryPill({ name, slug, icon }: { name: string; slug: string; icon: string }) {
  return (
    <Link
      href={`/discover?category=${slug}`}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-95"
    >
      <span className="text-[15px] leading-none">{icon}</span>
      {name}
    </Link>
  );
}
