/**
 * Copy previous global cable type/size catalog onto every process+machine
 * link (merge missing) and ensure "Others" exists.
 *
 * Run: npx tsx scripts/backfill-process-machine-cables.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const OTHERS = "Others";

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

async function getOrCreateType(
  prisma: PrismaClient,
  processMachineId: string,
  name: string,
  sortOrder: number,
) {
  const existing = await prisma.processMachineCableType.findUnique({
    where: { processMachineId_name: { processMachineId, name } },
    include: { sizes: { select: { name: true } } },
  });
  if (existing) return existing;

  try {
    return await prisma.processMachineCableType.create({
      data: {
        processMachineId,
        name,
        sortOrder,
        isActive: true,
      },
      include: { sizes: { select: { name: true } } },
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const again = await prisma.processMachineCableType.findUnique({
      where: { processMachineId_name: { processMachineId, name } },
      include: { sizes: { select: { name: true } } },
    });
    if (!again) throw err;
    return again;
  }
}

async function ensureOne(prisma: PrismaClient, processMachineId: string) {
  const globals = await prisma.machineCableType.findMany({
    where: { isActive: true },
    include: {
      sizes: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const globalsByName = new Map<string, (typeof globals)[number]>();
  for (const g of globals) {
    const name = g.name === "Other" ? OTHERS : g.name;
    if (!globalsByName.has(name) || g.name === OTHERS) {
      globalsByName.set(name, g);
    }
  }
  if (!globalsByName.has(OTHERS)) {
    globalsByName.set(OTHERS, {
      id: "",
      name: OTHERS,
      sortOrder: 9990,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      sizes: [],
    });
  }

  for (const [name, g] of globalsByName) {
    const type = await getOrCreateType(
      prisma,
      processMachineId,
      name,
      g.sortOrder,
    );

    const sizeNames = new Set(type.sizes.map((s) => s.name));
    const sizeCreates: {
      cableTypeId: string;
      name: string;
      sortOrder: number;
      isActive: boolean;
    }[] = [];
    let sizeSort = 10;
    for (const s of g.sizes) {
      const sizeName = s.name === "Other" ? OTHERS : s.name;
      if (sizeNames.has(sizeName)) continue;
      sizeNames.add(sizeName);
      sizeCreates.push({
        cableTypeId: type.id,
        name: sizeName,
        sortOrder: s.sortOrder || sizeSort,
        isActive: true,
      });
      sizeSort += 10;
    }
    if (!sizeNames.has(OTHERS)) {
      sizeCreates.push({
        cableTypeId: type.id,
        name: OTHERS,
        sortOrder: 9990,
        isActive: true,
      });
    }
    if (sizeCreates.length > 0) {
      await prisma.processMachineCableSize.createMany({
        data: sizeCreates,
        skipDuplicates: true,
      });
    }
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const legacy = await prisma.machineCableType.findUnique({
    where: { name: "Other" },
  });
  if (legacy) {
    const already = await prisma.machineCableType.findUnique({
      where: { name: "Others" },
    });
    if (!already) {
      await prisma.machineCableType.update({
        where: { id: legacy.id },
        data: { name: "Others" },
      });
      console.log('Renamed global "Other" → "Others"');
    }
  }

  let othersGlobal = await prisma.machineCableType.findUnique({
    where: { name: OTHERS },
  });
  if (!othersGlobal) {
    const maxSort = await prisma.machineCableType.aggregate({
      _max: { sortOrder: true },
    });
    othersGlobal = await prisma.machineCableType.create({
      data: {
        name: OTHERS,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
        isActive: true,
      },
    });
    console.log("Created global Others type");
  }

  const globalTypes = await prisma.machineCableType.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  for (const t of globalTypes) {
    await prisma.machineCableSize.upsert({
      where: {
        cableTypeId_name: { cableTypeId: t.id, name: OTHERS },
      },
      update: { isActive: true },
      create: {
        cableTypeId: t.id,
        name: OTHERS,
        sortOrder: 9990,
        isActive: true,
      },
    });
  }

  const links = await prisma.productionProcessMachine.findMany({
    select: { id: true },
  });
  console.log(`Syncing ${links.length} process+machine links…`);

  let i = 0;
  for (const link of links) {
    await ensureOne(prisma, link.id);
    i += 1;
    if (i % 10 === 0 || i === links.length) {
      console.log(`  ${i}/${links.length}`);
    }
  }

  const typeCount = await prisma.processMachineCableType.count();
  const sizeCount = await prisma.processMachineCableSize.count();
  console.log(`Done. Linked types=${typeCount}, sizes=${sizeCount}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
