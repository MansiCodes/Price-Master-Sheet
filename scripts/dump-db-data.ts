/**
 * Dump all public table data to a plain SQL file (INSERTs).
 * Usage: npx tsx scripts/dump-db-data.ts
 *
 * On the target AWS DB:
 *   1) npx prisma db push   (or apply 01-schema.sql)
 *   2) psql "$DATABASE_URL" -f backups/02-data.sql
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

config({ path: resolve(__dirname, "../.env"), override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (Buffer.isBuffer(value)) {
    return `E'\\\\x${value.toString("hex")}'`;
  }
  if (Array.isArray(value)) {
    // Postgres text[] / generic arrays as JSON-ish Postgres array of literals
    const inner = value.map((v) => sqlLiteral(v)).join(", ");
    // If elements look like JSON objects, store as JSON string instead
    if (value.some((v) => v !== null && typeof v === "object")) {
      return quoteString(JSON.stringify(value));
    }
    return `ARRAY[${inner}]`;
  }
  if (typeof value === "object") {
    return `${quoteString(JSON.stringify(value))}::jsonb`;
  }
  return quoteString(String(value));
}

function quoteString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set in .env");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });

  const outDir = resolve(__dirname, "../backups");
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, "02-data.sql");

  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename NOT LIKE '_prisma%'
     ORDER BY tablename`,
  );

  const lines: string[] = [
    "-- Cable Junction data dump",
    `-- Generated: ${new Date().toISOString()}`,
    "-- Apply schema first (prisma db push or 01-schema.sql), then this file.",
    "BEGIN;",
    "SET session_replication_role = replica;",
    "",
  ];

  for (const { tablename } of tables) {
    const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      tablename,
    );
    if (cols.length === 0) continue;

    const colNames = cols.map((c) => c.column_name);
    const selectList = colNames.map(quoteIdent).join(", ");
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${selectList} FROM ${quoteIdent(tablename)}`,
    );

    lines.push(`-- Table: ${tablename} (${rows.length} rows)`);
    lines.push(`TRUNCATE TABLE ${quoteIdent(tablename)} CASCADE;`);

    if (rows.length === 0) {
      lines.push("");
      continue;
    }

    const colSql = colNames.map(quoteIdent).join(", ");
    for (const row of rows) {
      const values = colNames.map((c) => sqlLiteral(row[c])).join(", ");
      lines.push(
        `INSERT INTO ${quoteIdent(tablename)} (${colSql}) VALUES (${values});`,
      );
    }
    lines.push("");
  }

  lines.push("SET session_replication_role = DEFAULT;");
  lines.push("COMMIT;");
  lines.push("");

  writeFileSync(outFile, lines.join("\n"), "utf8");
  console.log(`Wrote ${outFile}`);
  console.log(`Tables: ${tables.length}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
});
