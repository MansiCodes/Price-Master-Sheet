import { bucketDateForPeriod } from "@/lib/dashboard/period";
import type { DayPoint } from "@/lib/dashboard/metrics-types";
import { pctChange, toNum } from "@/lib/dashboard/metrics-helpers";
import type {
  AssembleGroupCount,
  AssemblePlant,
  AssembleShiftCount,
} from "@/lib/dashboard/metrics-assemble-types";

export function formSlotKey(
  multiPlant: boolean,
  plantId: string | undefined,
  dateStr: string,
  shift: string,
) {
  return multiPlant && plantId
    ? `${plantId}:${dateStr}:${shift}`
    : `${dateStr}:${shift}`;
}

export function addFormSlotsFromGroupBy(
  multiPlant: boolean,
  set: Set<string>,
  rows: AssembleGroupCount[],
) {
  for (const row of rows) {
    if (row._count <= 0) continue;
    set.add(
      formSlotKey(
        multiPlant,
        row.plantId,
        row.date.toISOString().slice(0, 10),
        row.shift,
      ),
    );
  }
}

export function shiftFilledForDate(
  date: string,
  shift: "DAY" | "NIGHT",
  plants: AssemblePlant[],
  multiPlant: boolean,
  purchaseDays: Set<string>,
  saleDays: Set<string>,
  stockDays: Set<string>,
  pettyDays: Set<string>,
) {
  if (!multiPlant) {
    return [
      purchaseDays.has(`${date}:${shift}`),
      saleDays.has(`${date}:${shift}`),
      stockDays.has(`${date}:${shift}`),
      pettyDays.has(`${date}:${shift}`),
    ].filter(Boolean).length;
  }

  let filled = 0;
  for (const plant of plants) {
    filled += [
      purchaseDays.has(`${plant.id}:${date}:${shift}`),
      saleDays.has(`${plant.id}:${date}:${shift}`),
      stockDays.has(`${plant.id}:${date}:${shift}`),
      pettyDays.has(`${plant.id}:${date}:${shift}`),
    ].filter(Boolean).length;
  }
  return filled;
}

export function buildWeekSeries(
  bucketKeys: string[],
  bucketGranularity: "day" | "week" | "month",
  periodStart: Date,
  weekSales: Array<{ date: Date; _sum: { salesValue: unknown } }>,
  weekPurchases: Array<{ date: Date; _sum: { invoiceValue: unknown } }>,
): DayPoint[] {
  const salesMap = new Map<string, number>();
  for (const r of weekSales) {
    const dateStr = r.date.toISOString().slice(0, 10);
    const key = bucketDateForPeriod(dateStr, bucketGranularity, periodStart);
    salesMap.set(key, (salesMap.get(key) ?? 0) + toNum(r._sum.salesValue));
  }
  const purchaseMap = new Map<string, number>();
  for (const r of weekPurchases) {
    const dateStr = r.date.toISOString().slice(0, 10);
    const key = bucketDateForPeriod(dateStr, bucketGranularity, periodStart);
    purchaseMap.set(
      key,
      (purchaseMap.get(key) ?? 0) + toNum(r._sum.invoiceValue),
    );
  }
  return bucketKeys.map((date) => ({
    date,
    sales: salesMap.get(date) ?? 0,
    purchases: purchaseMap.get(date) ?? 0,
  }));
}

export function weekChangePcts(
  weekSeries: DayPoint[],
  prevSales: unknown,
  prevPurchases: unknown,
) {
  const weekSalesTotal = weekSeries.reduce((sum, d) => sum + d.sales, 0);
  const weekPurchaseTotal = weekSeries.reduce((sum, d) => sum + d.purchases, 0);
  return {
    weekSalesTotal,
    weekPurchaseTotal,
    weekSalesChangePct: pctChange(weekSalesTotal, toNum(prevSales)),
    weekPurchaseChangePct: pctChange(weekPurchaseTotal, toNum(prevPurchases)),
  };
}

function shiftHasForm(rows: AssembleShiftCount[], shift: "DAY" | "NIGHT") {
  return rows.some((r) => r.shift === shift && r._count > 0);
}

export function buildScopedTodayByShift(opts: {
  todayPurchaseRows: AssembleShiftCount[];
  todaySaleRows: AssembleShiftCount[];
  todayStockRows: AssembleShiftCount[];
  todayProdRows: AssembleShiftCount[];
  todayPettyRows: AssembleShiftCount[];
}) {
  const { todayPurchaseRows, todaySaleRows, todayStockRows, todayProdRows, todayPettyRows } = opts;
  return {
    DAY: {
      purchaseFilled: shiftHasForm(todayPurchaseRows, "DAY"),
      saleFilled: shiftHasForm(todaySaleRows, "DAY"),
      stockFilled: shiftHasForm(todayStockRows, "DAY"),
      productionFilled: shiftHasForm(todayProdRows, "DAY"),
      pettyCashFilled: shiftHasForm(todayPettyRows, "DAY"),
    },
    NIGHT: {
      purchaseFilled: shiftHasForm(todayPurchaseRows, "NIGHT"),
      saleFilled: shiftHasForm(todaySaleRows, "NIGHT"),
      stockFilled: shiftHasForm(todayStockRows, "NIGHT"),
      productionFilled: shiftHasForm(todayProdRows, "NIGHT"),
      pettyCashFilled: shiftHasForm(todayPettyRows, "NIGHT"),
    },
  };
}
