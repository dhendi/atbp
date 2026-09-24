import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** GET-form search box for admin list pages: submits ?q= to the same path, so
 * the page filters server-side and works without client JS. */
export function AdminSearch({ action, query, placeholder }: { action: string; query: string; placeholder: string }) {
  return (
    <form className="mb-4 flex items-center gap-2" action={action}>
      <div className="relative max-w-sm flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input name="q" defaultValue={query} placeholder={placeholder} className="pl-8" />
      </div>
      {query && (
        <Link href={action} className="text-xs font-semibold text-ink-500 hover:text-ink-800">Clear</Link>
      )}
    </form>
  );
}
