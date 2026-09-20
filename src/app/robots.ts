import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

// Every account/private/transactional route, shared between the general
// rule and every named AI-crawler rule below so the two lists can't drift.
const DISALLOW = [
  "/api/",
  "/studio",
  "/studio/",
  "/admin",
  "/admin/",
  "/cart",
  "/checkout",
  "/orders",
  "/messages",
  "/notifications",
  "/profile",
  "/saved",
  "/following",
  "/login",
  "/signup",
];

// Named rules for the crawlers behind AI answer engines (ChatGPT, Claude,
// Perplexity, Google's AI Overviews) — functionally identical to the `*`
// rule today (both just allow "/" minus the same disallow list), but named
// explicitly rather than left to the wildcard default. That matters because
// GEO depends on these bots being able to crawl and cite product/seller
// pages, and a future tightening of the `*` rule (e.g. for a scraper
// crackdown) should not silently also block the crawlers ATBP actually
// wants indexing it for AI-generated answers.
const AI_CRAWLER_USER_AGENTS = [
  "GPTBot", // OpenAI
  "ChatGPT-User", // OpenAI, live browsing on a user's behalf
  "OAI-SearchBot", // OpenAI search
  "ClaudeBot", // Anthropic
  "anthropic-ai", // Anthropic
  "PerplexityBot", // Perplexity
  "Google-Extended", // Google's AI training/Gemini/AI Overviews opt-in
  "CCBot", // Common Crawl — feeds many LLM training sets
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
