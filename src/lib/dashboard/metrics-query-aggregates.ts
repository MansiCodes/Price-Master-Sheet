import { prisma } from "@/lib/db";

type EntryFilter = Record<string, unknown>;

export async function fetchDashboardAggregates(opts: {
  entryFilter: EntryFilter;
  plantFilter: { plantId: { in: string[] } };
  reportPlantIds: string[];
  todayDate: Date;
  periodStart: Date;
  weekStart: Date;
  previousStart: Date;
  previousEnd: Date;
}) {
  const {
    entryFilter,
    plantFilter,
    reportPlantIds,
    todayDate,
    periodStart,
    previousStart,
    previousEnd,
  } = opts;

  return Promise.all([
    prisma.sale.aggregate({
      where: { ...entryFilter, date: todayDate },
      _sum: { salesValue: true },
      _count: true,
    }),
    prisma.purchase.aggregate({
      where: { ...entryFilter, date: todayDate },
      _sum: { invoiceValue: true },
      _count: true,
    }),
    prisma.pettyCashEntry.aggregate({
      where: { ...entryFilter, date: todayDate },
      _sum: { amount: true, contractorSalary: true, supervisorSalary: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { ...entryFilter, date: { gte: periodStart, lte: todayDate } },
      _sum: { salesValue: true },
    }),
    prisma.purchase.aggregate({
      where: { ...entryFilter, date: { gte: periodStart, lte: todayDate } },
      _sum: { invoiceValue: true },
    }),
    prisma.pettyCashEntry.aggregate({
      where: { ...entryFilter, date: { gte: periodStart, lte: todayDate } },
      _sum: { amount: true, contractorSalary: true, supervisorSalary: true },
    }),
    prisma.manpowerEntry.aggregate({
      where: { ...entryFilter, date: { gte: periodStart, lte: todayDate } },
      _sum: { totalCost: true },
    }),
    prisma.stockEntry.aggregate({
      where: { ...entryFilter, date: { gte: periodStart, lte: todayDate } },
      _sum: { closingValue: true },
    }),
    typeof (prisma as { productionEntry?: { aggregate: typeof prisma.stockEntry.aggregate } })
      .productionEntry?.aggregate === "function"
      ? (
          prisma as unknown as {
            productionEntry: {
              aggregate: (args: {
                where: unknown;
                _sum: { quantity: true };
              }) => Promise<{ _sum: { quantity: unknown } }>;
            };
          }
        ).productionEntry.aggregate({
          where: { ...entryFilter, date: { gte: periodStart, lte: todayDate } },
          _sum: { quantity: true },
        })
      : Promise.resolve({ _sum: { quantity: 0 } }),
    prisma.sale.groupBy({
      by: ["date"],
      where: { ...entryFilter, date: { gte: periodStart, lte: todayDate } },
      _sum: { salesValue: true },
    }),
    prisma.purchase.groupBy({
      by: ["date"],
      where: { ...entryFilter, date: { gte: periodStart, lte: todayDate } },
      _sum: { invoiceValue: true },
    }),
    prisma.sale.aggregate({
      where: {
        ...entryFilter,
        date: { gte: previousStart, lte: previousEnd },
      },
      _sum: { salesValue: true },
    }),
    prisma.purchase.aggregate({
      where: {
        ...entryFilter,
        date: { gte: previousStart, lte: previousEnd },
      },
      _sum: { invoiceValue: true },
    }),
    prisma.dailyEntryStatus.findMany({
      where: { ...plantFilter, date: { gte: periodStart, lte: todayDate } },
      select: {
        plantId: true,
        date: true,
        shift: true,
        purchaseFilled: true,
        saleFilled: true,
        stockFilled: true,
        productionFilled: true,
        manpowerFilled: true,
        pettyCashFilled: true,
        allComplete: true,
      },
    }),
    prisma.dailyEntryStatus.findMany({
      where: { ...plantFilter, date: todayDate },
      select: {
        plantId: true,
        shift: true,
        purchaseFilled: true,
        saleFilled: true,
        stockFilled: true,
        productionFilled: true,
        manpowerFilled: true,
        pettyCashFilled: true,
        allComplete: true,
      },
    }),
    prisma.electricityRent.findMany({
      where: {
        plantId: { in: reportPlantIds },
        month: {
          gte: new Date(
            Date.UTC(
              periodStart.getUTCFullYear(),
              periodStart.getUTCMonth(),
              1,
            ),
          ),
          lte: new Date(
            Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1),
          ),
        },
      },
      select: {
        month: true,
        consumedUnits: true,
        billAmount: true,
        openingReading: true,
        closingReading: true,
      },
    }),
  ]);
}
