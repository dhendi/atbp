import * as Sentry from "@sentry/nextjs";

// Error monitoring only for now — no Session Replay or the feedback widget,
// both have their own (much smaller) free-tier quotas separate from the
// 5,000 errors/mo Sentry plan this app is on, and neither was asked for.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
