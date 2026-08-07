import { PrismaClient } from "@prisma/client";
import { logger } from "@/config/logger";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Cache the client on `global` in every environment, not just dev. On
// Vercel a function container can be reused across invocations (a "warm"
// start) — without this cache each warm invocation would spin up a brand
// new PrismaClient/connection instead of reusing one, and cold+warm starts
// together would quickly exhaust Postgres' connection limit. This is a
// direct (non-Accelerate) connection — if serverless traffic starts hitting
// Postgres' own connection cap, revisit Accelerate or a pooler like PgBouncer.
export const prisma = global.__prisma ?? new PrismaClient();
global.__prisma = prisma;

export async function connectDB(): Promise<void> {
  await prisma.$connect();
  logger.info("Connected to Postgres via Prisma");
}
