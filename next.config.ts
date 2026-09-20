import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Images and video come from a mix of sources: the Vercel Blob store for real
// uploads, plus Unsplash/Picsum/Pravatar placeholders baked into seed data —
// so img-src stays broad (any https origin) rather than an exact allowlist
// that would break the moment a new placeholder service shows up in seed data.
// React's dev-mode debugging (reconstructing stack traces across boundaries)
// calls eval() — production React never does, so this only loosens the dev
// server's own CSP, never the deployed build's.
const isDev = process.env.NODE_ENV !== "production";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  "media-src 'self' https:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Real seller uploads (product photos, videos, digital files)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Seed data placeholders
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      // Google OAuth profile photos
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  async redirects() {
    return [
      // atbp-two.vercel.app serves the identical deployment as atbph.com (the
      // real, canonical domain) — with no redirect, search engines can index
      // both as separate sites with the same content, splitting ranking
      // signals and risking a duplicate-content penalty. This folds all
      // traffic on the Vercel-assigned domain into the custom domain
      // permanently, so only one URL for any given page ever gets indexed.
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "atbp-two.vercel.app" }],
        destination: "https://atbph.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "atbp",
  project: "atbp",
  // SENTRY_AUTH_TOKEN (source-map upload) is only ever set in Vercel's build
  // environment — silent locally, since there's no token or need to upload
  // source maps for a dev build.
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
