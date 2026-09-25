import posthog from "posthog-js";

/** Product analytics (PostHog). Off until NEXT_PUBLIC_POSTHOG_KEY is set, so
 * local development and any deploy without the key send nothing.
 *
 * Deliberately cookieless: persistence is in-memory, so no cookie or
 * localStorage entry is written and the "we only use strictly necessary
 * cookies" statement in the Privacy Policy stays true. The trade-off is that
 * a visitor is a fresh anonymous id on each full page load; funnels within a
 * visit (signup, add to cart, checkout) still work.
 *
 * Never put personal data (names, emails, addresses, message text) in event
 * properties. */
export function initAnalytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    persistence: "memory",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    disable_session_recording: true,
    disable_surveys: true,
    // Staff screens show customer data in page text, so never record them.
    before_send: (event) => {
      const path = window.location.pathname;
      if (path.startsWith("/admin") || path.startsWith("/studio")) return null;
      return event;
    },
  });
}

export function track(event: string, properties?: Record<string, string | number | boolean>) {
  try {
    if (posthog.__loaded) posthog.capture(event, properties);
  } catch {
    // Analytics must never break a purchase or signup.
  }
}
