/**
 * One-time migration: per-machine MachineProcess rows -> global ProductionProcess
 * plus ProductionProcessMachine links. Idempotent; safe to re-run.
 */
import { config } from "dotenv";
config({ path: "F:/Cable_pl/Price-Master-Sheet/.env" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const legacy = await prisma.machineProcess.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { machine: { select: { id: true, name: true, code: true } } },
  });
  console.log(`Legacy per-machine process rows: ${legacy.length}`);

  // Group by process name — the same name on several machines becomes one process.
  const byName = new Map<string, { isActive: boolean; machineIds: string[] }>();
  for (const row of legacy) {
    const key = row.name.trim();
    if (!key) continue;
    const bucket = byName.get(key) ?? { isActive: false, machineIds: [] };
    if (row.isActive) bucket.isActive = true;
    if (!bucket.machineIds.includes(row.machineId)) {
      bucket.machineIds.push(row.machineId);
    }
    byName.set(key, bucket);
  }
  console.log(`Distinct process names: ${byName.size}`);

  let sort = 10;
  let createdProcesses = 0;
  let createdLinks = 0;

  for (const [name, bucket] of byName) {
    const process = await prisma.productionProcess.upsert({
      where: { name },
      create: { name, sortOrder: sort, isActive: bucket.isActive },
      update: {},
    });
    if (process.sortOrder === sort) createdProcesses += 1;
    sort += 10;

    for (const [i, machineId] of bucket.machineIds.entries()) {
      const link = await prisma.productionProcessMachine.upsert({
        where: { processId_machineId: { processId: process.id, machineId } },
        create: { processId: process.id, machineId, sortOrder: i * 10 },
        update: {},
      });
      if (link) createdLinks += 1;
    }

    console.log(`  "${name}" -> ${bucket.machineIds.length} machine(s)`);
  }

  const totalProcesses = await prisma.productionProcess.count();
  const totalLinks = await prisma.productionProcessMachine.count();
  const legacyStillThere = await prisma.machineProcess.count();
  console.log(
    `\nDone. ProductionProcess=${totalProcesses} links=${totalLinks} (legacy rows left intact: ${legacyStillThere})`,
  );
  void createdProcesses;
  void createdLinks;
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
