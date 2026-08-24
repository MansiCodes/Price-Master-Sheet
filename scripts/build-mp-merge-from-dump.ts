/**
 * Build a MERGE-ONLY SQL file for Machine Production tables from a full dump.
 * Does NOT touch P&L tables (Sale, Purchase, Stock, PettyCash, Plant, etc.).
 * Uses INSERT … ON CONFLICT DO NOTHING so existing rows stay.
 *
 * Usage:
 *   npx tsx scripts/build-mp-merge-from-dump.ts [path/to/02-data.sql]
 *   # then apply:
 *   CONFIRM_MP_MERGE=1 npx tsx scripts/apply-mp-merge.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const MP_TABLES_IN_ORDER = [
  // Supervisors first (FK for MachineProductionEntry)
  "User",
  "Machine",
  "MachineCableType",
  "MachineCableSize",
  "ProductionProcess",
  "MachineProcess",
  "ProductionProcessMachine",
  "MachineProductionEntry",
] as const;

type MpTable = (typeof MP_TABLES_IN_ORDER)[number];

function extractTableInserts(sql: string, table: string): string[] {
  const lines: string[] = [];
  const prefix = `INSERT INTO "${table}"`;
  for (const line of sql.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(prefix)) continue;
    lines.push(trimmed.replace(/;?\s*$/, ""));
  }
  return lines;
}

/** Only machine supervisors — never merge other roles (protects your admin / P&L users). */
function filterSupervisorUsers(inserts: string[]): string[] {
  return inserts.filter((line) => line.includes("'MACHINE_SUPERVISOR'"));
}

function toConflictSafe(insertSql: string): string {
  let sql = insertSql;
  // Empty photoUrls arrays need an explicit cast for Postgres.
  sql = sql.replace(/ARRAY\[\](?!::)/g, "ARRAY[]::text[]");
  // Dump encodes Prisma Decimals as '"123.45"'::jsonb — cast to numeric.
  sql = sql.replace(/'"([^"]+)"'::jsonb/g, "'$1'::numeric");
  return `${sql} ON CONFLICT DO NOTHING;`;
}

function main() {
  const inputPath = resolve(
    process.argv[2] ||
      "C:/Users/Admin/Downloads/backups-extract/02-data.sql",
  );
  const outDir = resolve(__dirname, "../exports");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "mp-merge-only.sql");

  const raw = readFileSync(inputPath, "utf8");
  const out: string[] = [
    "-- Machine Production MERGE ONLY",
    "-- Generated: " + new Date().toISOString(),
    "-- Source: " + inputPath,
    "--",
    "-- SAFE for P&L: does NOT truncate or touch Sale / Purchase / Stock /",
    "-- PettyCash / Plant / ElectricityRent / FixedAsset / etc.",
    "--",
    "-- Behavior: INSERT … ON CONFLICT DO NOTHING (keep your existing rows).",
    "-- Includes: Machine supervisors + machines + processes + cable types/sizes + MP entries.",
    "",
    "BEGIN;",
    "SET session_replication_role = replica;",
    "",
  ];

  let total = 0;
  for (const table of MP_TABLES_IN_ORDER) {
    let inserts = extractTableInserts(raw, table);
    if (table === "User") {
      inserts = filterSupervisorUsers(inserts);
    }
    out.push(`-- Table: ${table} (${inserts.length} inserts, merge)`);
    if (inserts.length === 0) {
      out.push(`-- (none)`);
      out.push("");
      continue;
    }
    for (const ins of inserts) {
      out.push(toConflictSafe(ins));
      total += 1;
    }
    out.push("");
  }

  out.push("SET session_replication_role = DEFAULT;");
  out.push("COMMIT;");
  out.push("");
  out.push(`-- Total INSERT statements: ${total}`);

  writeFileSync(outPath, out.join("\n"), "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(`Statements: ${total}`);
  console.log("Tables: " + MP_TABLES_IN_ORDER.join(", "));
}

main();
