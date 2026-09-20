"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Only fires if the root layout itself throws — src/app/error.tsx (already
// wired to Sentry too) handles every other error and keeps the site's own
// chrome/branding, which this can't since the root layout is what's broken.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px", fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: "8px", color: "#6b6b6b" }}>Please refresh the page.</p>
        </div>
      </body>
    </html>
  );
}
