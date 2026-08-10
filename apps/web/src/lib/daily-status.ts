import { prisma } from "@/lib/db";

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Refresh DailyEntryStatus flags for a plant/date based on whether
 * any entries exist that day for each of the five daily forms.
 */
export async function refreshDailyStatus(
  plantId: string,
  date: Date,
  accountantId?: string | null,
) {
  const day = startOfUtcDay(date);

  const [
    purchaseCount,
    saleCount,
    stockCount,
    manpowerCount,
    pettyCashCount,
    existing,
  ] = await Promise.all([
    prisma.purchase.count({ where: { plantId, date: day } }),
    prisma.sale.count({ where: { plantId, date: day } }),
    prisma.stockEntry.count({ where: { plantId, date: day } }),
    prisma.manpowerEntry.count({ where: { plantId, date: day } }),
    prisma.pettyCashEntry.count({ where: { plantId, date: day } }),
    prisma.dailyEntryStatus.findUnique({
      where: {
        plantId_date: { plantId, date: day },
      },
    }),
  ]);

  const purchaseFilled = purchaseCount > 0;
  const saleFilled = saleCount > 0;
  const stockFilled = stockCount > 0;
  const manpowerFilled = manpowerCount > 0;
  const pettyCashFilled = pettyCashCount > 0;
  const allComplete =
    purchaseFilled &&
    saleFilled &&
    stockFilled &&
    manpowerFilled &&
    pettyCashFilled;

  const completedAt = allComplete
    ? (existing?.completedAt ?? new Date())
    : null;

  const data = {
    purchaseFilled,
    saleFilled,
    stockFilled,
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
      plantId_date: { plantId, date: day },
    },
    create: {
      plantId,
      date: day,
      ...data,
      accountantId:
        accountantId !== undefined ? (accountantId ?? null) : null,
    },
    update: data,
  });
}
