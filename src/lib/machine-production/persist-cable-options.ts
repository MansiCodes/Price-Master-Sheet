import { prisma } from "@/lib/db";

const OTHERS = "Others";

/**
 * Ensures a cable type exists on this process+machine link (from Others entry).
 * Reactivates if it was previously removed. Always keeps an Others size option.
 */
export async function upsertProcessMachineCableType(opts: {
  processMachineId: string;
  name: string;
}) {
  const name = opts.name.trim();
  if (!name || name === OTHERS) {
    throw new Error("Invalid cable type name");
  }

  const existing = await prisma.processMachineCableType.findUnique({
    where: {
      processMachineId_name: {
        processMachineId: opts.processMachineId,
        name,
      },
    },
  });

  if (existing) {
    if (!existing.isActive) {
      return prisma.processMachineCableType.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return existing;
  }

  const maxSort = await prisma.processMachineCableType.aggregate({
    where: { processMachineId: opts.processMachineId },
    _max: { sortOrder: true },
  });

  return prisma.processMachineCableType.create({
    data: {
      processMachineId: opts.processMachineId,
      name,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
      isActive: true,
      sizes: {
        create: [{ name: OTHERS, sortOrder: 10, isActive: true }],
      },
    },
  });
}

/**
 * Ensures a cable size exists under a process+machine cable type.
 */
export async function upsertProcessMachineCableSize(opts: {
  cableTypeId: string;
  name: string;
}) {
  const name = opts.name.trim();
  if (!name || name === OTHERS) {
    throw new Error("Invalid cable size name");
  }

  const existing = await prisma.processMachineCableSize.findUnique({
    where: {
      cableTypeId_name: {
        cableTypeId: opts.cableTypeId,
        name,
      },
    },
  });

  if (existing) {
    if (!existing.isActive) {
      return prisma.processMachineCableSize.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return existing;
  }

  const maxSort = await prisma.processMachineCableSize.aggregate({
    where: { cableTypeId: opts.cableTypeId },
    _max: { sortOrder: true },
  });

  return prisma.processMachineCableSize.create({
    data: {
      cableTypeId: opts.cableTypeId,
      name,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
      isActive: true,
    },
  });
}

/**
 * Persist Others free-text into the process+machine dropdown catalog, then
 * return the final type/size names to store on the entry.
 */
export async function persistOthersCableOptions(opts: {
  processMachineId: string;
  cableType: string;
  cableSize: string;
}): Promise<{ cableType: string; cableSize: string }> {
  const typeName = opts.cableType.trim();
  const sizeName = opts.cableSize.trim();

  let type = await prisma.processMachineCableType.findFirst({
    where: {
      processMachineId: opts.processMachineId,
      name: typeName,
      isActive: true,
    },
  });

  if (!type && typeName && typeName !== OTHERS) {
    type = await upsertProcessMachineCableType({
      processMachineId: opts.processMachineId,
      name: typeName,
    });
  }

  if (type && sizeName && sizeName !== OTHERS) {
    await upsertProcessMachineCableSize({
      cableTypeId: type.id,
      name: sizeName,
    });
  }

  return { cableType: typeName, cableSize: sizeName };
}

export { OTHERS as CABLE_OTHERS_LABEL };
