import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Allow self-signed / AWS RDS certificates in serverless environment
if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.includes("rds.amazonaws.com")) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientGen: number | undefined;
};

/** Bump when Prisma schema fields change so the cached client is rebuilt. */
const PRISMA_CLIENT_GEN = 13;

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

  try {
    const url = new URL(raw);
    const mode = (url.searchParams.get("sslmode") ?? "").toLowerCase();

    if (raw.includes("rds.amazonaws.com")) {
      // Force no-verify for AWS RDS so self-signed cert chain is accepted
      url.searchParams.set("sslmode", "no-verify");
    } else if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
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
    // Drop the old client so new schema models (e.g. ProcessMachineCableType) bind.
    const prev = globalForPrisma.prisma;
    if (prev) {
      void prev.$disconnect().catch(() => undefined);
    }
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaClientGen = PRISMA_CLIENT_GEN;
  }
  return globalForPrisma.prisma;
}

/** @deprecated Prefer getPrisma() for clearer lazy init */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    // Use `client` as receiver so Prisma model getters keep the right `this`.
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;