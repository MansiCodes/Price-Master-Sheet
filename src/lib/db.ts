import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientGen: number | undefined;
};

/** Bump when Prisma schema fields change so the cached client is rebuilt. */
const PRISMA_CLIENT_GEN = 7;

/** Normalize Vercel/.env paste mistakes that cause pg "Invalid URL". */
function resolveDatabaseUrl(): string {
  let raw = process.env.DATABASE_URL?.trim() ?? "";
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }

  // Pasted as: DATABASE_URL=postgresql://...
  if (raw.toUpperCase().startsWith("DATABASE_URL=")) {
    raw = raw.slice("DATABASE_URL=".length).trim();
  }

  // Pasted with wrapping quotes
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }

  if (!/^postgres(ql)?:\/\//i.test(raw)) {
    throw new Error(
      `DATABASE_URL must start with postgresql:// (got length=${raw.length}, prefix=${JSON.stringify(raw.slice(0, 24))})`,
    );
  }

  // For Neon, upgrade sslmode=require to verify-full.
  // For AWS RDS, leave sslmode as is so rejectUnauthorized: false is honored.
  try {
    const url = new URL(raw);
    const mode = (url.searchParams.get("sslmode") ?? "").toLowerCase();
    if (!raw.includes("rds.amazonaws.com")) {
      if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
        url.searchParams.set("sslmode", "verify-full");
      }
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient() {
  const connectionString = resolveDatabaseUrl();
  const isRds = connectionString.includes("rds.amazonaws.com");

  const pool = new Pool({
    connectionString,
    ssl: isRds ? { rejectUnauthorized: false } : undefined,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Lazy Prisma accessor — avoids crashing Next.js build when DATABASE_URL is absent. */
export function getPrisma(): PrismaClient {
  if (
    !globalForPrisma.prisma ||
    globalForPrisma.prismaClientGen !== PRISMA_CLIENT_GEN
  ) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaClientGen = PRISMA_CLIENT_GEN;
  }
  return globalForPrisma.prisma;
}

/** @deprecated Prefer getPrisma() for clearer lazy init */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
