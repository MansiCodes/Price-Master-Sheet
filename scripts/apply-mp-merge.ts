/**
 * Apply exports/mp-merge-only.sql to DATABASE_URL (merge Machine Production only).
 *
 * Requires CONFIRM_MP_MERGE=1 so you don't run it by accident against AWS.
 *
 *   npx tsx scripts/build-mp-merge-from-dump.ts
 *   CONFIRM_MP_MERGE=1 npx tsx scripts/apply-mp-merge.ts
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

config({ path: resolve(__dirname, "../.env"), override: true });

async function main() {
  if (process.env.CONFIRM_MP_MERGE !== "1") {
    console.error(
      "Refusing to run. Set CONFIRM_MP_MERGE=1 after you review exports/mp-merge-only.sql",
    );
    console.error(
      "This connects to DATABASE_URL from .env (your file points at AWS RDS).",
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const ensurePath = resolve(
    __dirname,
    "mp-ensure-process-cable-schema.sql",
  );
  const sqlPath = resolve(
    process.argv[2] || resolve(__dirname, "../exports/mp-merge-only.sql"),
  );
  const ensureSql = readFileSync(ensurePath, "utf8");
  const sql = readFileSync(sqlPath, "utf8");

  const safeUrl = url.replace(/:[^:@/]+@/, ":***@");
  console.log(`Applying merge to ${safeUrl}`);
  console.log(`Ensure schema: ${ensurePath}`);
  console.log(`File: ${sqlPath}`);

  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") || url.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    console.log("Ensuring ProcessMachineCable* tables exist (additive)...");
    await client.query(ensureSql);

    // Count P&L rows before
    const before = await client.query(`
      SELECT
        (SELECT count(*)::int FROM "Sale") AS sales,
        (SELECT count(*)::int FROM "Purchase") AS purchases,
        (SELECT count(*)::int FROM "StockEntry") AS stock,
        (SELECT count(*)::int FROM "PettyCashEntry") AS petty,
        (SELECT count(*)::int FROM "Machine") AS machines,
        (SELECT count(*)::int FROM "MachineProductionEntry") AS mp_entries,
        (SELECT count(*)::int FROM "ProductionProcess") AS processes,
        (SELECT count(*)::int FROM "ProcessMachineCableType") AS pm_cable_types,
        (SELECT count(*)::int FROM "ProcessMachineCableSize") AS pm_cable_sizes
    `);
    console.log("Before:", before.rows[0]);

    await client.query(sql);

    const after = await client.query(`
      SELECT
        (SELECT count(*)::int FROM "Sale") AS sales,
        (SELECT count(*)::int FROM "Purchase") AS purchases,
        (SELECT count(*)::int FROM "StockEntry") AS stock,
        (SELECT count(*)::int FROM "PettyCashEntry") AS petty,
        (SELECT count(*)::int FROM "Machine") AS machines,
        (SELECT count(*)::int FROM "MachineProductionEntry") AS mp_entries,
        (SELECT count(*)::int FROM "ProductionProcess") AS processes,
        (SELECT count(*)::int FROM "ProcessMachineCableType") AS pm_cable_types,
        (SELECT count(*)::int FROM "ProcessMachineCableSize") AS pm_cable_sizes
    `);
    console.log("After: ", after.rows[0]);

    const b = before.rows[0] as Record<string, number>;
    const a = after.rows[0] as Record<string, number>;
    if (
      b.sales !== a.sales ||
      b.purchases !== a.purchases ||
      b.stock !== a.stock ||
      b.petty !== a.petty
    ) {
      console.error("ERROR: P&L row counts changed — unexpected!");
      process.exit(2);
    }
    console.log("P&L counts unchanged. Machine Production merge OK.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
