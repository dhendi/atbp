import Link from "next/link";
import { getInterest } from "@/lib/interests";

export function InterestShortcut({ slug }: { slug: string }) {
  const interest = getInterest(slug);
  return (
    <Link
      href={`/discover?interest=${slug}`}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-95"
    >
      {interest.emoji && <span className="text-[15px] leading-none">{interest.emoji}</span>}
      {interest.label}
    </Link>
  );
}
