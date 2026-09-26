import { prisma } from "@/lib/db";
import { refreshDailyStatusForDate } from "@/lib/daily-status";
import { getShiftApprovalStartDate } from "@/lib/shift-approval-policy";

export { fetchDashboardAggregates } from "@/lib/dashboard/metrics-query-aggregates";

type EntryFilter = Record<string, unknown>;

export async function fetchWeekFormSlots(opts: {
  entryFilter: EntryFilter;
  todayDate: Date;
  weekStart: Date;
  multiPlant: boolean;
}) {
  const { entryFilter, todayDate, weekStart, multiPlant } = opts;
  const formGroupBy = multiPlant
    ? (["plantId", "date", "shift"] as const)
    : (["date", "shift"] as const);

  return Promise.all([
    prisma.productionEntry.groupBy({
      by: [...formGroupBy],
      where: { ...entryFilter, date: todayDate },
      _count: true,
    }),
    prisma.productionEntry.groupBy({
      by: [...formGroupBy],
      where: { ...entryFilter, date: { gte: weekStart, lte: todayDate } },
      _count: true,
    }),
    prisma.stockEntry.groupBy({
      by: [...formGroupBy],
      where: { ...entryFilter, date: { gte: weekStart, lte: todayDate } },
      _count: true,
    }),
    prisma.pettyCashEntry.groupBy({
      by: [...formGroupBy],
      where: {
        ...entryFilter,
        date: { gte: weekStart, lte: todayDate },
        entryType: "EXPENSE",
      },
      _count: true,
    }),
    prisma.sale.groupBy({
      by: [...formGroupBy],
      where: { ...entryFilter, date: { gte: weekStart, lte: todayDate } },
      _count: true,
    }),
    prisma.purchase.groupBy({
      by: [...formGroupBy],
      where: { ...entryFilter, date: { gte: weekStart, lte: todayDate } },
      _count: true,
    }),
  ]);
}

export async function fetchTodayFormRows(entryFilter: EntryFilter, todayDate: Date) {
  return Promise.all([
    prisma.stockEntry.groupBy({
      by: ["shift"],
      where: { ...entryFilter, date: todayDate },
      _count: true,
    }),
    prisma.purchase.groupBy({
      by: ["shift"],
      where: { ...entryFilter, date: todayDate },
      _count: true,
    }),
    prisma.sale.groupBy({
      by: ["shift"],
      where: { ...entryFilter, date: todayDate },
      _count: true,
    }),
    prisma.pettyCashEntry.groupBy({
      by: ["shift"],
      where: { ...entryFilter, date: todayDate, entryType: "EXPENSE" },
      _count: true,
    }),
    prisma.productionEntry.groupBy({
      by: ["shift"],
      where: { ...entryFilter, date: todayDate },
      _count: true,
    }),
  ]);
}

export async function buildApprovedEntryFilter(opts: {
  approvedOnly?: boolean;
  reportPlantIds: string[];
  statusRangeStart: Date;
  todayDate: Date;
  enteredById?: string;
}) {
  const plantFilter = { plantId: { in: opts.reportPlantIds } };
  if (!opts.approvedOnly) {
    return {
      plantFilter,
      entryFilter: {
        ...plantFilter,
        ...(opts.enteredById ? { enteredById: opts.enteredById } : {}),
      },
    };
  }

  const approvalStart = getShiftApprovalStartDate();
  const approvedStatuses = await prisma.dailyEntryStatus.findMany({
    where: {
      plantId: { in: opts.reportPlantIds },
      date: {
        gte: approvalStart > opts.statusRangeStart ? approvalStart : opts.statusRangeStart,
        lte: opts.todayDate,
      },
      approvedByHead: true,
    },
    select: { plantId: true, date: true, shift: true },
  });

  const orClauses: Array<Record<string, unknown>> = [];
  if (opts.statusRangeStart < approvalStart) {
    orClauses.push({
      date: { gte: opts.statusRangeStart, lt: approvalStart },
    });
  }
  for (const s of approvedStatuses) {
    orClauses.push({ date: s.date, shift: s.shift });
  }
  const approvedFilter = orClauses.length > 0 ? { OR: orClauses } : { id: "none" };
  return {
    plantFilter,
    entryFilter: {
      ...plantFilter,
      ...(opts.enteredById ? { enteredById: opts.enteredById } : {}),
      ...approvedFilter,
    },
  };
}

export async function refreshIncompleteTodayStatuses(
  plants: Array<{ id: string }>,
  todayDate: Date,
  enteredById?: string,
) {
  await Promise.all(
    plants.map(async (plant) => {
      const existingRows = await prisma.dailyEntryStatus.findMany({
        where: { plantId: plant.id, date: todayDate },
        select: { shift: true, allComplete: true },
      });
      const hasBothShifts = existingRows.some((r) => r.shift === "DAY")
        && existingRows.some((r) => r.shift === "NIGHT");
      const anyShiftNotComplete = existingRows.some((r) => !r.allComplete);
      if (!hasBothShifts || anyShiftNotComplete) {
        await refreshDailyStatusForDate(plant.id, todayDate, enteredById);
      }
    }),
  );
}
