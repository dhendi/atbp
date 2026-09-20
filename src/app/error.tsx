"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
      <Logo className="mb-10" />
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-live-100 text-live-500">
        <AlertTriangle size={28} />
      </span>
      <h1 className="font-display mt-5 text-2xl font-semibold text-ink-900">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        That&apos;s on us, not you. Try again, or head back to the homepage.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="brand" onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
