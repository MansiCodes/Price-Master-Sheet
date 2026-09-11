/**
 * One-time repair: Contractor Wages / Labour Contractor / Salary Expenses
 * were saved with the same value in both `amount` and contractorSalary /
 * supervisorSalary, so the expense register showed 2× the form amount.
 *
 * Run: npx tsx scripts/fix-expense-amount-doubling.ts
 * Dry-run (default): prints counts only.
 * Apply: npx tsx scripts/fix-expense-amount-doubling.ts --apply
 */
import { config } from "dotenv";
config({ path: ".env", override: true });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const apply = process.argv.includes("--apply");
  const url = new URL(process.env.DATABASE_URL!);
  if (
    url.hostname.includes("rds.amazonaws.com") ||
    url.hostname.includes("neon.tech")
  ) {
    url.searchParams.set("sslmode", "no-verify");
  }
  const pool = new pg.Pool({
    connectionString: url.toString(),
    ssl:
      url.hostname.includes("rds.amazonaws.com") ||
      url.hostname.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : undefined,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const wageDupes = await prisma.pettyCashEntry.findMany({
      where: {
        expenseHead: { in: ["Contractor Wages", "Labour Contractor"] },
        contractorSalary: { gt: 0 },
      },
      select: {
        id: true,
        expenseHead: true,
        amount: true,
        contractorSalary: true,
        plant: { select: { code: true, name: true } },
      },
    });

    const wageFix = wageDupes.filter(
      (r) => Number(r.amount) === Number(r.contractorSalary),
    );

    const salaryDupes = await prisma.pettyCashEntry.findMany({
      where: {
        expenseHead: "Salary Expenses",
        supervisorSalary: { gt: 0 },
      },
      select: {
        id: true,
        expenseHead: true,
        amount: true,
        supervisorSalary: true,
        plant: { select: { code: true, name: true } },
      },
    });

    const salaryFix = salaryDupes.filter(
      (r) => Number(r.amount) === Number(r.supervisorSalary),
    );

    console.log(
      `Wage rows with amount === contractorSalary: ${wageFix.length}`,
    );
    for (const r of wageFix.slice(0, 15)) {
      console.log(
        `  ${r.plant.code} | ${r.expenseHead} | amount=${r.amount} contractor=${r.contractorSalary}`,
      );
    }
    console.log(
      `Salary rows with amount === supervisorSalary: ${salaryFix.length}`,
    );
    for (const r of salaryFix.slice(0, 15)) {
      console.log(
        `  ${r.plant.code} | ${r.expenseHead} | amount=${r.amount} supervisor=${r.supervisorSalary}`,
      );
    }

    if (!apply) {
      console.log("\nDry-run only. Re-run with --apply to fix.");
      return;
    }

    if (wageFix.length > 0) {
      const res = await prisma.pettyCashEntry.updateMany({
        where: { id: { in: wageFix.map((r) => r.id) } },
        data: { contractorSalary: 0 },
      });
      console.log(`Cleared contractorSalary on ${res.count} wage rows.`);
    }
    if (salaryFix.length > 0) {
      const res = await prisma.pettyCashEntry.updateMany({
        where: { id: { in: salaryFix.map((r) => r.id) } },
        data: { supervisorSalary: 0 },
      });
      console.log(`Cleared supervisorSalary on ${res.count} salary rows.`);
    }
    console.log("Done.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
