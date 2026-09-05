import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const OTHERS = "Others";

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

async function getOrCreateType(
  processMachineId: string,
  name: string,
  sortOrder: number,
) {
  const existing = await prisma.processMachineCableType.findUnique({
    where: { processMachineId_name: { processMachineId, name } },
    include: { sizes: { select: { id: true, name: true } } },
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
      include: { sizes: { select: { id: true, name: true } } },
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const again = await prisma.processMachineCableType.findUnique({
      where: { processMachineId_name: { processMachineId, name } },
      include: { sizes: { select: { id: true, name: true } } },
    });
    if (!again) throw err;
    return again;
  }
}

/**
 * Sync previous global cable catalog onto a process+machine link:
 * - copies any missing global types/sizes (keeps admin-added options)
 * - always ensures an "Others" type and an "Others" size on each type
 */
export async function ensureProcessMachineCableCatalog(
  processMachineId: string,
): Promise<void> {
  const [linkedCount, globalCount, othersType] = await Promise.all([
    prisma.processMachineCableType.count({ where: { processMachineId } }),
    prisma.machineCableType.count({ where: { isActive: true } }),
    prisma.processMachineCableType.findUnique({
      where: {
        processMachineId_name: { processMachineId, name: OTHERS },
      },
      select: { id: true, isActive: true },
    }),
  ]);

  // Already synced from the previous global catalog — only keep Others active.
  if (linkedCount >= Math.max(globalCount, 1) && othersType) {
    if (!othersType.isActive) {
      await prisma.processMachineCableType.update({
        where: { id: othersType.id },
        data: { isActive: true },
      });
    }
    const missingOthersSize = await prisma.processMachineCableSize.count({
      where: {
        cableType: { processMachineId },
        name: OTHERS,
      },
    });
    if (missingOthersSize < linkedCount) {
      const types = await prisma.processMachineCableType.findMany({
        where: { processMachineId },
        select: {
          id: true,
          sizes: { where: { name: OTHERS }, select: { id: true } },
        },
      });
      const toCreate = types
        .filter((t) => t.sizes.length === 0)
        .map((t) => ({
          cableTypeId: t.id,
          name: OTHERS,
          sortOrder: 9990,
          isActive: true,
        }));
      if (toCreate.length > 0) {
        await prisma.processMachineCableSize.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
      }
    }
    return;
  }

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
    const type = await getOrCreateType(processMachineId, name, g.sortOrder);

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

  await prisma.processMachineCableType.updateMany({
    where: { processMachineId, name: OTHERS, isActive: false },
    data: { isActive: true },
  });
  await prisma.processMachineCableSize.updateMany({
    where: {
      name: OTHERS,
      isActive: false,
      cableType: { processMachineId },
    },
    data: { isActive: true },
  });
}

export { OTHERS as CABLE_OTHERS_LABEL };
