import Link from "next/link";
import { type LucideIcon } from "lucide-react";

/** `action` turns a dead-end empty state into one with somewhere to go next
 * ("Browse New on ATBP" instead of just "No results") — optional so every
 * existing call site keeps working unchanged; add it where a next step
 * genuinely exists. */
export function EmptyState({
  icon: Icon, title, description, action, asPageHeading = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  /** Render the title as the page's <h1> (for a full-page empty state). */
  asPageHeading?: boolean;
}) {
  const Title = asPageHeading ? "h1" : "p";
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-ink-200 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        <Icon size={24} />
      </span>
      <div>
        <Title className="font-bold text-ink-800">{title}</Title>
        {description && <p className="mt-1 max-w-xs text-sm text-ink-500">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="mt-1 rounded-full bg-ink-900 px-4 py-2 text-xs font-bold text-white hover:bg-ink-700">
          {action.label}
        </Link>
      )}
    </div>
  );
}
