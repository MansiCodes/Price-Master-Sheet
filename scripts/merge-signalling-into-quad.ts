/**
 * Move all transactional rows from legacy SIGNALLING plant onto QUAD
 * so Quad + Signal P&L shows both histories.
 *
 * Idempotent — safe to re-run.
 * Usage: npx tsx --env-file=.env scripts/merge-signalling-into-quad.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env"), override: true });

import { prisma } from "../src/lib/db";

async function logCount(label: string, count: number): Promise<void> {
  console.log(`  ${label}: ${count}`);
}

async function main() {
  const quad = await prisma.plant.findFirst({
    where: { code: "QUAD" },
    select: { id: true, name: true },
  });
  const signalling = await prisma.plant.findFirst({
    where: { code: "SIGNALLING" },
    select: { id: true, name: true },
  });

  if (!quad) {
    throw new Error("QUAD plant not found");
  }
  if (!signalling) {
    console.log("No SIGNALLING plant — nothing to merge.");
    return;
  }
  if (quad.id === signalling.id) {
    console.log("QUAD and SIGNALLING share the same id — nothing to merge.");
    return;
  }

  const fromId = signalling.id;
  const toId = quad.id;
  console.log(`Merging SIGNALLING (${fromId}) → QUAD (${toId})`);

  // Electricity / rent — unique (plantId, month)
  {
    const rows = await prisma.electricityRent.findMany({
      where: { plantId: fromId },
    });
    let moved = 0;
    let dropped = 0;
    for (const row of rows) {
      const clash = await prisma.electricityRent.findUnique({
        where: { plantId_month: { plantId: toId, month: row.month } },
        select: { id: true },
      });
      if (clash) {
        await prisma.electricityRent.delete({ where: { id: row.id } });
        dropped += 1;
      } else {
        await prisma.electricityRent.update({
          where: { id: row.id },
          data: { plantId: toId },
        });
        moved += 1;
      }
    }
    await logCount("electricityRent moved", moved);
    await logCount("electricityRent dropped (month clash)", dropped);
  }

  // Daily entry status — unique (plantId, date, shift)
  {
    const rows = await prisma.dailyEntryStatus.findMany({
      where: { plantId: fromId },
    });
    let moved = 0;
    let dropped = 0;
    for (const row of rows) {
      const clash = await prisma.dailyEntryStatus.findUnique({
        where: {
          plantId_date_shift: {
            plantId: toId,
            date: row.date,
            shift: row.shift,
          },
        },
        select: { id: true },
      });
      if (clash) {
        await prisma.dailyEntryStatus.delete({ where: { id: row.id } });
        dropped += 1;
      } else {
        await prisma.dailyEntryStatus.update({
          where: { id: row.id },
          data: { plantId: toId },
        });
        moved += 1;
      }
    }
    await logCount("dailyEntryStatus moved", moved);
    await logCount("dailyEntryStatus dropped (clash)", dropped);
  }

  // User plant roles — unique (userId, plantId)
  {
    const rows = await prisma.userPlantRole.findMany({
      where: { plantId: fromId },
    });
    let moved = 0;
    let dropped = 0;
    for (const row of rows) {
      const clash = await prisma.userPlantRole.findUnique({
        where: { userId_plantId: { userId: row.userId, plantId: toId } },
        select: { id: true },
      });
      if (clash) {
        await prisma.userPlantRole.delete({ where: { id: row.id } });
        dropped += 1;
      } else {
        await prisma.userPlantRole.update({
          where: { id: row.id },
          data: { plantId: toId },
        });
        moved += 1;
      }
    }
    await logCount("userPlantRole moved", moved);
    await logCount("userPlantRole dropped (clash)", dropped);
  }

  // Manpower rates — unique (plantId, role)
  {
    const rows = await prisma.manpowerRateSetting.findMany({
      where: { plantId: fromId },
    });
    let dropped = 0;
    for (const row of rows) {
      const clash = await prisma.manpowerRateSetting.findUnique({
        where: { plantId_role: { plantId: toId, role: row.role } },
        select: { id: true },
      });
      if (clash) {
        await prisma.manpowerRateSetting.delete({ where: { id: row.id } });
        dropped += 1;
      } else {
        await prisma.manpowerRateSetting.update({
          where: { id: row.id },
          data: { plantId: toId },
        });
      }
    }
    await logCount("manpowerRateSetting dropped (clash)", dropped);
  }

  // P&L overrides — unique (plantId, periodFrom, periodTo)
  {
    const rows = await prisma.plantPnlOverride.findMany({
      where: { plantId: fromId },
    });
    let dropped = 0;
    for (const row of rows) {
      const clash = await prisma.plantPnlOverride.findUnique({
        where: {
          plantId_periodFrom_periodTo: {
            plantId: toId,
            periodFrom: row.periodFrom,
            periodTo: row.periodTo,
          },
        },
        select: { id: true },
      });
      if (clash) {
        await prisma.plantPnlOverride.delete({ where: { id: row.id } });
        dropped += 1;
      } else {
        await prisma.plantPnlOverride.update({
          where: { id: row.id },
          data: { plantId: toId },
        });
      }
    }
    await logCount("plantPnlOverride dropped (clash)", dropped);
  }

  const bulk = async (
    label: string,
    fn: () => Promise<{ count: number }>,
  ) => {
    const res = await fn();
    await logCount(label, res.count);
  };

  await bulk("sale", () =>
    prisma.sale.updateMany({
      where: { plantId: fromId },
      data: { plantId: toId },
    }),
  );
  await bulk("purchase", () =>
    prisma.purchase.updateMany({
      where: { plantId: fromId },
      data: { plantId: toId },
    }),
  );
  await bulk("stockEntry", () =>
    prisma.stockEntry.updateMany({
      where: { plantId: fromId },
      data: { plantId: toId },
    }),
  );
  await bulk("pettyCashEntry", () =>
    prisma.pettyCashEntry.updateMany({
      where: { plantId: fromId },
      data: { plantId: toId },
    }),
  );
  await bulk("productionEntry", () =>
    prisma.productionEntry.updateMany({
      where: { plantId: fromId },
      data: { plantId: toId },
    }),
  );
  await bulk("manpowerEntry", () =>
    prisma.manpowerEntry.updateMany({
      where: { plantId: fromId },
      data: { plantId: toId },
    }),
  );
  await bulk("fixedAsset", () =>
    prisma.fixedAsset.updateMany({
      where: { plantId: fromId },
      data: { plantId: toId },
    }),
  );
  await bulk("plantContact", () =>
    prisma.plantContact.updateMany({
      where: { plantId: fromId },
      data: { plantId: toId },
    }),
  );
  await bulk("creditScoreAward", () =>
    prisma.creditScoreAward.updateMany({
      where: { plantId: fromId },
      data: { plantId: toId },
    }),
  );
  await bulk("reminderLog", () =>
    prisma.reminderLog.updateMany({
      where: { plantId: fromId },
      data: { plantId: toId },
    }),
  );

  await prisma.plant.update({
    where: { id: fromId },
    data: {
      isActive: false,
      name: "Quad + Signal Plant (legacy Signal)",
    },
  });
  await prisma.plant.update({
    where: { id: toId },
    data: {
      isActive: true,
      name: "Quad + Signal Plant",
    },
  });

  const left = await prisma.sale.count({ where: { plantId: fromId } });
  const onQuad = await prisma.sale.count({ where: { plantId: toId } });
  console.log(`\nSales remaining on SIGNALLING: ${left}`);
  console.log(`Sales now on QUAD: ${onQuad}`);
  console.log("Done. SIGNALLING rows now live under QUAD.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
