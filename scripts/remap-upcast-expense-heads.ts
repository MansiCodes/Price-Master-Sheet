/**
 * Remap existing Upcast Misc Exp. rows to catalog expense heads / entry types.
 * Safe to re-run.
 *
 *   npx tsx --env-file=.env scripts/remap-upcast-expense-heads.ts
 */
import { PettyCashKind } from "@prisma/client";
import { getPrisma } from "../src/lib/db";
import {
  normalizeUpcastExpenseHead,
  UPCAST_MISC_NATURES,
} from "../src/lib/plant-catalogs";

async function main() {
  const prisma = getPrisma();
  const plant = await prisma.plant.findUnique({ where: { code: "UPCAST" } });
  if (!plant) throw new Error("UPCAST plant not found");

  const rows = await prisma.pettyCashEntry.findMany({
    where: { plantId: plant.id },
  });

  let updated = 0;
  for (const row of rows) {
    const factory = Number(row.amount);
    const contractor = Number(row.contractorSalary);
    const supervisor = Number(row.supervisorSalary);
    const fromNature = normalizeUpcastExpenseHead(
      row.nature || row.expenseHead || "",
    );
    const fromHead = normalizeUpcastExpenseHead(row.expenseHead || "");

    let resolvedHead = fromNature || fromHead;
    if (
      (supervisor > 0 && factory === 0 && contractor === 0) ||
      resolvedHead === "Salary Expenses" ||
      (row.expenseHead === "Petty Cash" && supervisor > 0 && factory === 0)
    ) {
      resolvedHead = "Salary Expenses";
    } else if (
      (contractor > 0 && factory === 0 && supervisor === 0) ||
      resolvedHead === "Contractor Wages"
    ) {
      resolvedHead = "Contractor Wages";
    } else if (
      (UPCAST_MISC_NATURES as readonly string[]).includes(fromHead)
    ) {
      resolvedHead = fromHead;
    } else if (
      (UPCAST_MISC_NATURES as readonly string[]).includes(fromNature)
    ) {
      resolvedHead = fromNature;
    }

    const entryType =
      resolvedHead === "Salary Expenses" ||
      resolvedHead === "Contractor Wages"
        ? PettyCashKind.PETTY_CASH
        : (UPCAST_MISC_NATURES as readonly string[]).includes(resolvedHead) ||
            resolvedHead === "Fuel & Power" ||
            resolvedHead === "Unloading of MT" ||
            resolvedHead === "Factory Rent"
          ? PettyCashKind.EXPENSE
          : row.entryType;

    if (
      resolvedHead === row.expenseHead &&
      entryType === row.entryType
    ) {
      continue;
    }

    await prisma.pettyCashEntry.update({
      where: { id: row.id },
      data: { expenseHead: resolvedHead, entryType },
    });
    updated += 1;
  }

  const grouped = await prisma.pettyCashEntry.groupBy({
    by: ["expenseHead", "entryType"],
    where: { plantId: plant.id },
    _sum: { amount: true, contractorSalary: true, supervisorSalary: true },
    _count: true,
  });
  console.log(`Updated ${updated} / ${rows.length} rows`);
  console.log(JSON.stringify(grouped, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
