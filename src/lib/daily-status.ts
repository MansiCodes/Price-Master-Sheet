import type { ManpowerShift } from "@prisma/client";
import { prisma } from "@/lib/db";
import { allRequiredShiftFormsComplete } from "@/lib/shift-forms";

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Refresh DailyEntryStatus flags for a plant/date/shift based on entries
 * recorded for that shift only.
 */
export async function refreshDailyStatus(
  plantId: string,
  date: Date,
  shift: ManpowerShift,
  accountantId?: string | null,
) {
  const day = startOfUtcDay(date);
  const where = { plantId, date: day, shift };

  const [
    purchaseCount,
    saleCount,
    stockCount,
    productionCount,
    pettyCashCount,
    existing,
  ] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.sale.count({ where }),
    prisma.stockEntry.count({ where }),
    prisma.productionEntry.count({ where }),
    prisma.pettyCashEntry.count({
      where: { ...where, entryType: "EXPENSE" },
    }),
    prisma.dailyEntryStatus.findUnique({
      where: {
        plantId_date_shift: { plantId, date: day, shift },
      },
    }),
  ]);

  const purchaseFilled = purchaseCount > 0;
  const saleFilled = saleCount > 0;
  const stockFilled = stockCount > 0;
  const productionFilled = productionCount > 0;
  const manpowerFilled = false;
  const pettyCashFilled = pettyCashCount > 0;
  const allComplete = allRequiredShiftFormsComplete({
    purchaseFilled,
    saleFilled,
    stockFilled,
    pettyCashFilled,
  });

  const completedAt = allComplete
    ? (existing?.completedAt ?? new Date())
    : null;

  const data = {
    purchaseFilled,
    saleFilled,
    stockFilled,
    productionFilled,
    manpowerFilled,
    pettyCashFilled,
    allComplete,
    completedAt,
    ...(accountantId !== undefined
      ? { accountantId: accountantId ?? null }
      : {}),
  };

  return prisma.dailyEntryStatus.upsert({
    where: {
      plantId_date_shift: { plantId, date: day, shift },
    },
    create: {
      plantId,
      date: day,
      shift,
      ...data,
      accountantId:
        accountantId !== undefined ? (accountantId ?? null) : null,
    },
    update: data,
  });
}

/** Refresh both day and night status rows for a plant/date. */
export async function refreshDailyStatusForDate(
  plantId: string,
  date: Date,
  accountantId?: string | null,
) {
  return Promise.all([
    refreshDailyStatus(plantId, date, "DAY", accountantId),
    refreshDailyStatus(plantId, date, "NIGHT", accountantId),
  ]);
}
