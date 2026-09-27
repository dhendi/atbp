import { PrismaClient } from "@prisma/client";

// Local development and scripts must never touch the production database
// (compute endpoint id of the production Neon branch). Deployed builds run with
// NODE_ENV=production, so this only ever fires on a developer machine.
const PRODUCTION_DB_ENDPOINT_ID = "ep-spring-wildflower-auso1gvs";
if (process.env.NODE_ENV !== "production" && (process.env.DATABASE_URL ?? "").includes(PRODUCTION_DB_ENDPOINT_ID)) {
  throw new Error("DATABASE_URL points at the production database. Use the dev branch connection string for local work.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma's default pool is 5 connections with a 10s wait. Pages here run many
// queries at once, and when Neon's compute is waking from idle those queue up
// past 10s and the page fails ("Timed out fetching a new connection", seen in
// production logs). Give each function instance a bigger pool and a longer
// wait, without touching the integration-managed DATABASE_URL itself.
function pooledDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "10");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "30");
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: pooledDatabaseUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
