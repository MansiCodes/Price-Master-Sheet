/**
 * Upsert Conductor plant (and any other listPlantSeeds plants missing from DB).
 * Usage: npx tsx --env-file=.env scripts/ensure-plants.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env"), override: true });

import { ManpowerRole } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { listPlantSeeds } from "../src/lib/plant-segments";

async function main() {
  const seeds = listPlantSeeds();
  const rateRows: { role: ManpowerRole; ratePerDay: number }[] = [
    { role: ManpowerRole.MANAGER, ratePerDay: 4000 },
    { role: ManpowerRole.OPERATOR, ratePerDay: 1500 },
    { role: ManpowerRole.HELPER, ratePerDay: 800 },
  ];

  for (const entry of seeds) {
    const plant = await prisma.plant.upsert({
      where: { code: entry.code },
      update: { name: entry.name, isActive: true },
      create: { name: entry.name, code: entry.code, isActive: true },
    });
    console.log(`Plant OK: ${plant.name} (${plant.code}) id=${plant.id}`);

    for (const row of rateRows) {
      await prisma.manpowerRateSetting.upsert({
        where: {
          plantId_role: { plantId: plant.id, role: row.role },
        },
        update: { ratePerDay: row.ratePerDay },
        create: {
          plantId: plant.id,
          role: row.role,
          ratePerDay: row.ratePerDay,
        },
      });
    }
  }

  const all = await prisma.plant.findMany({
    select: { name: true, code: true, isActive: true },
    orderBy: { name: "asc" },
  });
  console.log("\nAll plants in DB:");
  for (const p of all) {
    console.log(`  - ${p.name} [${p.code}] active=${p.isActive}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
