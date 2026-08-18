import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/db";

async function main() {
  const plant = await prisma.plant.findUnique({
    where: { code: "CAT6" },
    select: { id: true, name: true },
  });
  if (!plant) throw new Error("CAT-6 plant not found");

  const periodFrom = new Date(Date.UTC(2025, 3, 1));  // 01-Apr-2025
  const periodTo = new Date(Date.UTC(2026, 4, 22));    // 22-May-2026

  // Exact values from Excel P&L formulas
  const data = {
    plantId: plant.id,
    periodFrom,
    periodTo,
    openingStock: 2216983.15,     // Stock-Mar-25!O57
    closingStock: 11586301.34,    // Stock(UP&UK)!F26 + N28
    purchases: 92722057.9,        // Purchase!K251 + ATC-to-NF!H21
    sales: 94755539.02,           // Sales-NF!J505 + 514436 + Sales-NF!J591
    pettyCash: 112595,            // Petty Cash!C130
    wagesSalary: 3354618.4,       // Salary!C22 * 70%
    depreciation: 4151829.07,     // Fixed asset depreciation
    interestOnTl: 3762040,        // Fixed
    variableCost: 947555.39,      // Sales × 1%
  };

  await prisma.plantPnlOverride.upsert({
    where: {
      plantId_periodFrom_periodTo: {
        plantId: plant.id,
        periodFrom,
        periodTo,
      },
    },
    create: data,
    update: data,
  });

  console.log(`Seeded P&L override for ${plant.name} (${periodFrom.toISOString().slice(0,10)} to ${periodTo.toISOString().slice(0,10)})`);
  console.log(data);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
