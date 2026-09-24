import { PrismaClient } from "@prisma/client";

// Local development and scripts must never touch the production database
// (compute endpoint id of the production Neon branch). Deployed builds run with
// NODE_ENV=production, so this only ever fires on a developer machine.
const PRODUCTION_DB_ENDPOINT_ID = "ep-spring-wildflower-auso1gvs";
if (process.env.NODE_ENV !== "production" && (process.env.DATABASE_URL ?? "").includes(PRODUCTION_DB_ENDPOINT_ID)) {
  throw new Error("DATABASE_URL points at the production database. Use the dev branch connection string for local work.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
