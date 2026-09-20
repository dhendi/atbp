import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function GlobalNotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
      <Logo className="mb-10" />
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        <Compass size={28} />
      </span>
      <h1 className="font-display mt-5 text-2xl font-semibold text-ink-900">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        The link might be broken, or the page may have moved.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild variant="brand">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/discover">Browse Discover</Link>
        </Button>
      </div>
    </div>
  );
}
