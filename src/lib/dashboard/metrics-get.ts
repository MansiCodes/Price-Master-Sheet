import { prisma } from "@/lib/db";
import { parseDateOnly, todayDateString } from "@/lib/dates";
import { calculatePlantPnl } from "@/lib/pnl/calculate";
import { resolveReportPlantIds } from "@/lib/plant-merge";
import { countRequiredShiftForms } from "@/lib/shift-forms";
import {
  getDashboardPeriodBounds,
  parseDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard/period";
import {
  TODAY_MODULE_COUNT,
  type DashboardMetrics,
} from "@/lib/dashboard/metrics-types";
import {
  addDays,
  buildEmptyMetrics,
  toNum,
} from "@/lib/dashboard/metrics-helpers";
import { buildDashboardResult, sumElectricity } from "@/lib/dashboard/metrics-result";
import {
  buildApprovedEntryFilter,
  fetchDashboardAggregates,
  fetchTodayFormRows,
  fetchWeekFormSlots,
  refreshIncompleteTodayStatuses,
} from "@/lib/dashboard/metrics-queries";
import {
  addFormSlotsFromGroupBy,
  buildDailyReportRows,
  buildFormBars,
  buildPlantToday,
  buildScopedTodayByShift,
  buildWeekSeries,
  countFormsFilled,
  shiftFilledForDate,
  weekChangePcts,
} from "@/lib/dashboard/metrics-assemble";

export async function getDashboardMetrics(
  plantIds: string[],
  options: {
    includePnl: boolean;
    enteredById?: string;
    approvedOnly?: boolean;
    period?: DashboardPeriod | string | null;
  },
): Promise<DashboardMetrics> {
  const period = parseDashboardPeriod(options.period);
  const today = todayDateString();
  const todayDate = parseDateOnly(today);
  const bounds = getDashboardPeriodBounds(period, today);
  const periodStart = bounds.periodStart;
  const weekStartStr = addDays(today, -6);
  const weekStart = parseDateOnly(weekStartStr);
  const statusRangeStart =
    bounds.previousStart < weekStart ? bounds.previousStart : weekStart;

  const empty = buildEmptyMetrics(period, today, todayDate, bounds, plantIds);
  if (plantIds.length === 0) return empty;

  const expandedPlantIds = (
    await Promise.all(plantIds.map((id) => resolveReportPlantIds(id)))
  ).flat();
  const reportPlantIds = [...new Set(expandedPlantIds)];
  const { plantFilter, entryFilter } = await buildApprovedEntryFilter({
    approvedOnly: options.approvedOnly,
    reportPlantIds,
    statusRangeStart,
    todayDate,
    enteredById: options.enteredById,
  });
  const scoped = Boolean(options.enteredById);

  const plants = await prisma.plant.findMany({
    where: { id: { in: plantIds }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  await refreshIncompleteTodayStatuses(plants, todayDate, options.enteredById);

  const [
    todaySalesAgg,
    todayPurchaseAgg,
    todayPettyAgg,
    mtdSalesAgg,
    mtdPurchaseAgg,
    mtdPettyAgg,
    mtdManpowerAgg,
    mtdStockAgg,
    mtdProductionAgg,
    weekSales,
    weekPurchases,
    prevWeekSalesAgg,
    prevWeekPurchaseAgg,
    statuses,
    todayStatuses,
    electricityRows,
  ] = await fetchDashboardAggregates({
    entryFilter,
    plantFilter,
    reportPlantIds,
    todayDate,
    periodStart,
    weekStart,
    previousStart: bounds.previousStart,
    previousEnd: bounds.previousEnd,
  });

  const prodDays = new Set<string>();
  const stockDays = new Set<string>();
  const pettyDays = new Set<string>();
  const saleDays = new Set<string>();
  const purchaseDays = new Set<string>();
  const multiPlant = plants.length > 1;

  const [, weekProd, weekStock, weekPetty, weekSaleRows, weekPurchaseRows] =
    await fetchWeekFormSlots({
      entryFilter,
      todayDate,
      weekStart,
      multiPlant,
    });

  addFormSlotsFromGroupBy(multiPlant, prodDays, weekProd);
  addFormSlotsFromGroupBy(multiPlant, stockDays, weekStock);
  addFormSlotsFromGroupBy(multiPlant, pettyDays, weekPetty);
  addFormSlotsFromGroupBy(multiPlant, saleDays, weekSaleRows);
  addFormSlotsFromGroupBy(multiPlant, purchaseDays, weekPurchaseRows);

  const perShiftFormTotal = multiPlant
    ? plants.length * TODAY_MODULE_COUNT
    : TODAY_MODULE_COUNT;

  const weekSeries = buildWeekSeries(
    bounds.bucketKeys,
    bounds.bucketGranularity,
    periodStart,
    weekSales,
    weekPurchases,
  );
  const {
    weekSalesTotal,
    weekPurchaseTotal,
    weekSalesChangePct,
    weekPurchaseChangePct,
  } = weekChangePcts(
    weekSeries,
    prevWeekSalesAgg._sum.salesValue,
    prevWeekPurchaseAgg._sum.invoiceValue,
  );

  const [
    todayStockRows,
    todayPurchaseRows,
    todaySaleRows,
    todayPettyRows,
    todayProdRows,
  ] = await fetchTodayFormRows(entryFilter, todayDate);

  const scopedTodayByShift = buildScopedTodayByShift({
    todayPurchaseRows,
    todaySaleRows,
    todayStockRows,
    todayProdRows,
    todayPettyRows,
  });

  const plantToday = buildPlantToday(
    plants,
    todayStatuses,
    scoped,
    scopedTodayByShift,
  );
  const formBars = buildFormBars(
    plantToday,
    scoped,
    scopedTodayByShift,
    plants.length,
  );
  const formsFilled = countFormsFilled(
    plantToday,
    todayStatuses,
    scoped,
    scopedTodayByShift,
  );
  const formsTotal = scoped
    ? TODAY_MODULE_COUNT * 2
    : plants.length * TODAY_MODULE_COUNT * 2;

  let statusSlots = 0;
  let statusFilled = 0;
  let daysWithSale = 0;
  let daysWithPurchase = 0;
  for (const s of statuses) {
    statusSlots += TODAY_MODULE_COUNT;
    statusFilled += countRequiredShiftForms(s);
  }
  const bucketCount = Math.max(bounds.bucketKeys.length, 1);
  for (const p of weekSeries) {
    if (p.sales > 0) daysWithSale += 1;
    if (p.purchases > 0) daysWithPurchase += 1;
  }

  const weekCompletion = bounds.bucketKeys.map((date) => {
    if (bounds.bucketGranularity !== "day") return 0;
    const slots = perShiftFormTotal * 2;
    if (slots === 0) return 0;
    const filled =
      shiftFilledForDate(date, "DAY", plants, multiPlant, purchaseDays, saleDays, stockDays, pettyDays) +
      shiftFilledForDate(date, "NIGHT", plants, multiPlant, purchaseDays, saleDays, stockDays, pettyDays);
    return Math.round((filled / slots) * 100);
  });

  let mtdNetProfit: number | null = null;
  if (options.includePnl) {
    const pnls = await Promise.all(
      plantIds.map((id) =>
        calculatePlantPnl(id, periodStart, todayDate, {
          enteredById: options.enteredById,
        }),
      ),
    );
    mtdNetProfit = pnls.reduce((sum, p) => sum + p.netProfit, 0);
  }

  const dailyReportRows = buildDailyReportRows(
    today, plants, multiPlant, purchaseDays, saleDays, stockDays, pettyDays,
  );

  const petty =
    toNum(todayPettyAgg._sum.amount) +
    toNum(todayPettyAgg._sum.contractorSalary) +
    toNum(todayPettyAgg._sum.supervisorSalary);
  const mtdExpenses =
    toNum(mtdPettyAgg._sum.amount) +
    toNum(mtdPettyAgg._sum.contractorSalary) +
    toNum(mtdPettyAgg._sum.supervisorSalary);
  const electricity = sumElectricity(
    electricityRows,
    period,
    todayDate,
    bounds.periodDayCount,
  );

  return buildDashboardResult({
    period,
    periodLabel: empty.periodLabel,
    today,
    monthLabel: empty.monthLabel,
    todaySales: toNum(todaySalesAgg._sum.salesValue),
    todayPurchases: toNum(todayPurchaseAgg._sum.invoiceValue),
    todayPetty: petty,
    mtdSales: toNum(mtdSalesAgg._sum.salesValue),
    mtdPurchases: toNum(mtdPurchaseAgg._sum.invoiceValue),
    mtdExpenses,
    mtdManpower: toNum(mtdManpowerAgg._sum.totalCost),
    mtdStockValue: toNum(mtdStockAgg._sum.closingValue),
    mtdProductionQty: toNum(mtdProductionAgg._sum.quantity),
    mtdNetProfit,
    ...electricity,
    formsCompleteToday: formsFilled,
    formsTotalToday: formsTotal,
    plantsTracked: plants.length,
    weekSeries,
    weekSalesTotal,
    weekPurchaseTotal,
    weekSalesChangePct,
    weekPurchaseChangePct,
    weekCompletion,
    dailyReportRows,
    plantToday,
    formBars,
    statusSlots,
    statusFilled,
    daysWithSale,
    daysWithPurchase,
    bucketCount,
  });
}
