import type { DashboardPeriod } from "@/lib/dashboard/period";
import type { DashboardMetrics } from "@/lib/dashboard/metrics-types";
import { toNum } from "@/lib/dashboard/metrics-helpers";
import type { DailyReportRow, DayPoint, FormFillBar, PlantTodayRow } from "@/lib/dashboard/metrics-types";

export function sumElectricity(
  electricityRows: Array<{
    consumedUnits: unknown;
    openingReading: unknown;
    closingReading: unknown;
    billAmount: unknown;
  }>,
  period: DashboardPeriod,
  todayDate: Date,
  periodDayCount: number,
) {
  let electricityBill = 0;
  let electricityUnits = 0;
  for (const row of electricityRows) {
    const unitsRaw = toNum(row.consumedUnits);
    const opening = toNum(row.openingReading);
    const closing = toNum(row.closingReading);
    const units =
      unitsRaw > 0 ? unitsRaw : closing > opening ? closing - opening : 0;
    electricityBill += toNum(row.billAmount);
    electricityUnits += units;
  }
  if (period === "day" || period === "week") {
    const daysInMonth =
      new Date(
        Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + 1, 0),
      ).getUTCDate();
    const scale = Math.min(1, periodDayCount / Math.max(daysInMonth, 1));
    electricityBill *= scale;
    electricityUnits *= scale;
  }
  return {
    electricityBill,
    electricityUnits,
    electricityPerUnit:
      electricityUnits > 0 ? electricityBill / electricityUnits : 0,
    electricityDailyAvg:
      periodDayCount > 0 ? electricityUnits / periodDayCount : 0,
  };
}

export function buildDashboardResult(input: {
  period: DashboardPeriod;
  periodLabel: string;
  today: string;
  monthLabel: string;
  todaySales: number;
  todayPurchases: number;
  todayPetty: number;
  mtdSales: number;
  mtdPurchases: number;
  mtdExpenses: number;
  mtdManpower: number;
  mtdStockValue: number;
  mtdProductionQty: number;
  mtdNetProfit: number | null;
  electricityBill: number;
  electricityUnits: number;
  electricityPerUnit: number;
  electricityDailyAvg: number;
  formsCompleteToday: number;
  formsTotalToday: number;
  plantsTracked: number;
  weekSeries: DayPoint[];
  weekSalesTotal: number;
  weekPurchaseTotal: number;
  weekSalesChangePct: number;
  weekPurchaseChangePct: number;
  weekCompletion: number[];
  dailyReportRows: DailyReportRow[];
  plantToday: PlantTodayRow[];
  formBars: FormFillBar[];
  statusSlots: number;
  statusFilled: number;
  daysWithSale: number;
  daysWithPurchase: number;
  bucketCount: number;
}): DashboardMetrics {
  const {
    statusSlots,
    statusFilled,
    daysWithSale,
    daysWithPurchase,
    bucketCount,
    formsCompleteToday,
    formsTotalToday,
    ...rest
  } = input;
  return {
    ...rest,
    formsCompleteToday,
    formsTotalToday,
    kra: {
      dailyEntryRate:
        statusSlots > 0 ? Math.round((statusFilled / statusSlots) * 100) : 0,
      salesCoverage: Math.round((daysWithSale / bucketCount) * 100),
      purchaseDiscipline: Math.round((daysWithPurchase / bucketCount) * 100),
      checklistToday:
        formsTotalToday > 0
          ? Math.round((formsCompleteToday / formsTotalToday) * 100)
          : 0,
    },
  };
}
