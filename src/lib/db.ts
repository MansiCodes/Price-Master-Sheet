import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientGen: number | undefined;
};

/** Bump when Prisma schema fields change so the cached client is rebuilt. */
const PRISMA_CLIENT_GEN = 15;

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

  // pg v8 warns that sslmode=require/prefer/verify-ca currently alias verify-full.
  // Prefer the explicit mode so Neon connections stay secure without the console noise.
  try {
    const url = new URL(raw);
    const mode = (url.searchParams.get("sslmode") ?? "").toLowerCase();
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient() {
  // Re-resolve @prisma/client from disk so `prisma generate` is visible after
  // schema changes (Next.js otherwise keeps a stale bundled PrismaClient).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const prismaPkgPath = require.resolve("@prisma/client");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  delete require.cache[prismaPkgPath];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const defaultPath = require.resolve("@prisma/client/default");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    delete require.cache[defaultPath];
  } catch {
    // optional path
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const runtimePath = require.resolve(".prisma/client/index");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    delete require.cache[runtimePath];
  } catch {
    // optional path
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: FreshPrismaClient } = require("@prisma/client") as {
    PrismaClient: typeof PrismaClient;
  };

  const connectionString = resolveDatabaseUrl();
  const adapter = new PrismaPg({ connectionString });
  return new FreshPrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function clientMissingModels(client: PrismaClient): boolean {
  // After schema adds, an old hot-reloaded client can lack new delegates.
  const c = client as unknown as Record<string, unknown>;
  return (
    c.machine == null ||
    c.machineProcess == null ||
    c.machineCableType == null ||
    c.machineCableSize == null ||
    c.machineProductionEntry == null
  );
}

/** Lazy Prisma accessor — avoids crashing Next.js build when DATABASE_URL is absent. */
export function getPrisma(): PrismaClient {
  const stale =
    !globalForPrisma.prisma ||
    globalForPrisma.prismaClientGen !== PRISMA_CLIENT_GEN ||
    clientMissingModels(globalForPrisma.prisma);

  if (stale) {
    try {
      void globalForPrisma.prisma?.$disconnect();
    } catch {
      // ignore disconnect errors from stale clients
    }
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaClientGen = PRISMA_CLIENT_GEN;

    if (clientMissingModels(globalForPrisma.prisma)) {
      throw new Error(
        "Prisma client is missing Machine Production models. Stop npm run dev, run `npx prisma generate`, then start npm run dev again.",
      );
    }
  }
  return globalForPrisma.prisma;
}

/**
 * Proxy so `import { prisma }` stays lazy. Model delegates are getters on
 * PrismaClient — Reflect.get must use the real client as receiver, otherwise
 * `prisma.machine` / etc. become undefined.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
