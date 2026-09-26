import { parseDateOnly } from "@/lib/dates";
import {
  formatPeriodLabel,
  getDashboardPeriodBounds,
  parseDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard/period";
import {
  TODAY_MODULE_COUNT,
  TODAY_MODULES,
  type DashboardMetrics,
  type FormFillBar,
} from "@/lib/dashboard/metrics-types";

export function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (
    typeof v === "object" &&
    v !== null &&
    "toString" in v &&
    typeof (v as { toString: () => string }).toString === "function"
  ) {
    return Number((v as { toString: () => string }).toString());
  }
  return Number(v);
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildEmptyMetrics(
  period: ReturnType<typeof parseDashboardPeriod>,
  today: string,
  todayDate: Date,
  bounds: ReturnType<typeof getDashboardPeriodBounds>,
  plantIds: string[],
): DashboardMetrics {
  const emptyFormBars: FormFillBar[] = TODAY_MODULES.map((m) => ({
    label: m.label,
    hrefSuffix: m.href,
    color: m.color,
    filled: 0,
    total: Math.max(1, plantIds.length),
  }));

  const monthLabel = todayDate.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    period,
    periodLabel: formatPeriodLabel(period, bounds),
    today,
    monthLabel,
    todaySales: 0,
    todayPurchases: 0,
    todayPetty: 0,
    mtdSales: 0,
    mtdPurchases: 0,
    mtdExpenses: 0,
    mtdManpower: 0,
    mtdStockValue: 0,
    mtdProductionQty: 0,
    mtdNetProfit: null,
    electricityBill: 0,
    electricityUnits: 0,
    electricityPerUnit: 0,
    electricityDailyAvg: 0,
    formsCompleteToday: 0,
    formsTotalToday: Math.max(1, plantIds.length) * TODAY_MODULE_COUNT * 2,
    plantsTracked: plantIds.length,
    weekSeries: bounds.bucketKeys.map((date) => ({
      date,
      sales: 0,
      purchases: 0,
    })),
    weekSalesTotal: 0,
    weekPurchaseTotal: 0,
    weekSalesChangePct: 0,
    weekPurchaseChangePct: 0,
    weekCompletion: Array.from({ length: bounds.bucketKeys.length }, () => 0),
    dailyReportRows: [],
    plantToday: [],
    formBars: emptyFormBars,
    kra: {
      dailyEntryRate: 0,
      salesCoverage: 0,
      purchaseDiscipline: 0,
      checklistToday: 0,
    },
  };
}

export type { DashboardPeriod };
