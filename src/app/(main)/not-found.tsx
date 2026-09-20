import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center md:px-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        <Compass size={28} />
      </span>
      <h1 className="font-display mt-5 text-2xl font-semibold text-ink-900">We couldn&apos;t find that</h1>
      <p className="mt-2 text-sm text-ink-500">
        The page or listing you&apos;re looking for might have been moved, sold, or taken down.
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
