import { config } from "dotenv";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Only load .env / .env.production if process.env.DATABASE_URL is not already set
if (!process.env.DATABASE_URL) {
  const envPath = resolve(__dirname, ".env");
  const envProdPath = resolve(__dirname, ".env.production");
  if (existsSync(envPath)) {
    config({ path: envPath });
  } else if (existsSync(envProdPath)) {
    config({ path: envProdPath });
  }
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/plant_pnl";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
