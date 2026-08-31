import { prisma } from "@/lib/db";
import { parseDateOnly, todayDateString } from "@/lib/dates";
import { refreshDailyStatusForDate } from "@/lib/daily-status";
import { calculatePlantPnl } from "@/lib/pnl/calculate";
import {
  REQUIRED_SHIFT_FORM_COUNT,
  countRequiredShiftForms,
} from "@/lib/shift-forms";

export type DayPoint = { date: string; sales: number; purchases: number };

export const TODAY_MODULES = [
  { key: "purchaseFilled" as const, label: "Purchase", href: "today", color: "#0d9488" },
  { key: "saleFilled" as const, label: "Sales", href: "today", color: "#b45309" },
  { key: "stockFilled" as const, label: "Stock", href: "today", color: "#7c3aed" },
  { key: "productionFilled" as const, label: "Production", href: "today", color: "#0284c7" },
  { key: "pettyCashFilled" as const, label: "Expense", href: "today", color: "#ef6351" },
];

export const TODAY_MODULE_COUNT = REQUIRED_SHIFT_FORM_COUNT;

export type PlantTodayModule = {
  key: (typeof TODAY_MODULES)[number]["key"];
  label: string;
  href: string;
  color: string;
  filled: boolean;
};

export type PlantTodayRow = {
  id: string;
  name: string;
  code: string;
  completed: number;
  total: number;
  allComplete: boolean;
  modules: PlantTodayModule[];
};

export type FormFillBar = {
  label: string;
  hrefSuffix: string;
  color: string;
  filled: number;
  total: number;
};

export type DailyReportRow = {
  date: string;
  completed: number;
  total: number;
  allComplete: boolean;
  dayShift: { completed: number; total: number; allComplete: boolean };
  nightShift: { completed: number; total: number; allComplete: boolean };
};

export type DashboardMetrics = {
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
  kra: {
    dailyEntryRate: number;
    salesCoverage: number;
    purchaseDiscipline: number;
    checklistToday: number;
  };
};

function toNum(v: unknown): number {
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

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function addDays(dateStr: string, days: number): string {
  const d = parseDateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getDashboardMetrics(
  plantIds: string[],
  options: { includePnl: boolean; enteredById?: string; approvedOnly?: boolean },
): Promise<DashboardMetrics> {
  const today = todayDateString();
  const todayDate = parseDateOnly(today);
  const weekStartStr = addDays(today, -6);
  const weekStart = parseDateOnly(weekStartStr);
  const prevWeekStartStr = addDays(today, -13);
  const prevWeekStart = parseDateOnly(prevWeekStartStr);
  const prevWeekEnd = parseDateOnly(addDays(today, -7));
  const monthStart = new Date(
    Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1),
  );

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

  const empty: DashboardMetrics = {
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
    formsCompleteToday: 0,
    formsTotalToday: Math.max(1, plantIds.length) * TODAY_MODULE_COUNT * 2,
    plantsTracked: plantIds.length,
    weekSeries: Array.from({ length: 7 }, (_, i) => ({
      date: addDays(weekStartStr, i),
      sales: 0,
      purchases: 0,
    })),
    weekSalesTotal: 0,
    weekPurchaseTotal: 0,
    weekSalesChangePct: 0,
    weekPurchaseChangePct: 0,
    weekCompletion: Array.from({ length: 7 }, () => 0),
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

  if (plantIds.length === 0) return empty;

  const approvedStatuses = options.approvedOnly
    ? await prisma.dailyEntryStatus.findMany({
        where: {
          plantId: { in: plantIds },
          date: { gte: prevWeekStart, lte: todayDate },
          approvedByHead: true,
        },
        select: { plantId: true, date: true, shift: true },
      })
    : [];

  const approvedFilter = options.approvedOnly
    ? (approvedStatuses.length > 0
        ? {
            OR: approvedStatuses.map((s) => ({
              plantId: s.plantId,
              date: s.date,
              shift: s.shift,
            })),
          }
        : { id: "none" })
    : {};

  const plantFilter = { plantId: { in: plantIds } };
  const entryFilter = {
    ...plantFilter,
    ...(options.enteredById ? { enteredById: options.enteredById } : {}),
    ...approvedFilter,
  };
  const scoped = Boolean(options.enteredById);

  const plants = await prisma.plant.findMany({
    where: { id: { in: plantIds }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  await Promise.all(
    plants.map(async (plant) => {
      // `dailyEntryStatus` is cached flags used by the dashboard (week compare dots).
      // We must refresh when the cached value is missing OR previously incomplete,
      // otherwise UI can show stale "not teal" dots even after forms are filled.
      const existingRows = await prisma.dailyEntryStatus.findMany({
        where: { plantId: plant.id, date: todayDate },
        select: { shift: true, allComplete: true },
      });

      const hasBothShifts = existingRows.some((r) => r.shift === "DAY")
        && existingRows.some((r) => r.shift === "NIGHT");
      const anyShiftNotComplete = existingRows.some((r) => !r.allComplete);

      if (!hasBothShifts || anyShiftNotComplete) {
        await refreshDailyStatusForDate(plant.id, todayDate, options.enteredById);
      }
    }),
  );

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
  ] = await Promise.all([
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
      where: { ...entryFilter, date: { gte: monthStart, lte: todayDate } },
      _sum: { salesValue: true },
    }),
    prisma.purchase.aggregate({
      where: { ...entryFilter, date: { gte: monthStart, lte: todayDate } },
      _sum: { invoiceValue: true },
    }),
    prisma.pettyCashEntry.aggregate({
      where: { ...entryFilter, date: { gte: monthStart, lte: todayDate } },
      _sum: { amount: true, contractorSalary: true, supervisorSalary: true },
    }),
    prisma.manpowerEntry.aggregate({
      where: { ...entryFilter, date: { gte: monthStart, lte: todayDate } },
      _sum: { totalCost: true },
    }),
    prisma.stockEntry.aggregate({
      where: { ...entryFilter, date: { gte: monthStart, lte: todayDate } },
      _sum: { closingValue: true },
    }),
    // Guard: stale Prisma client without ProductionEntry must not crash the dashboard.
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
          where: { ...entryFilter, date: { gte: monthStart, lte: todayDate } },
          _sum: { quantity: true },
        })
      : Promise.resolve({ _sum: { quantity: 0 } }),
    prisma.sale.groupBy({
      by: ["date"],
      where: { ...entryFilter, date: { gte: weekStart, lte: todayDate } },
      _sum: { salesValue: true },
    }),
    prisma.purchase.groupBy({
      by: ["date"],
      where: { ...entryFilter, date: { gte: weekStart, lte: todayDate } },
      _sum: { invoiceValue: true },
    }),
    prisma.sale.aggregate({
      where: {
        ...entryFilter,
        date: { gte: prevWeekStart, lte: prevWeekEnd },
      },
      _sum: { salesValue: true },
    }),
    prisma.purchase.aggregate({
      where: {
        ...entryFilter,
        date: { gte: prevWeekStart, lte: prevWeekEnd },
      },
      _sum: { invoiceValue: true },
    }),
    prisma.dailyEntryStatus.findMany({
      where: { ...plantFilter, date: { gte: weekStart, lte: todayDate } },
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
  ]);

  const todaySaleCount = Number(todaySalesAgg._count ?? 0);
  const todayPurchaseCount = Number(todayPurchaseAgg._count ?? 0);
  const todayPettyCount = Number(todayPettyAgg._count ?? 0);

  let todayProductionCount = 0;
  const prodDays = new Set<string>();
  const stockDays = new Set<string>();
  const pettyDays = new Set<string>();
  const saleDays = new Set<string>();
  const purchaseDays = new Set<string>();
  const multiPlant = plants.length > 1;

  function formSlotKey(
    plantId: string | undefined,
    dateStr: string,
    shift: string,
  ) {
    return multiPlant && plantId
      ? `${plantId}:${dateStr}:${shift}`
      : `${dateStr}:${shift}`;
  }

  function addFormSlotsFromGroupBy(
    set: Set<string>,
    rows: { plantId?: string; date: Date; shift: string; _count: number }[],
  ) {
    for (const row of rows) {
      if (row._count <= 0) continue;
      set.add(
        formSlotKey(
          row.plantId,
          row.date.toISOString().slice(0, 10),
          row.shift,
        ),
      );
    }
  }

  const formGroupBy = multiPlant
    ? (["plantId", "date", "shift"] as const)
    : (["date", "shift"] as const);

  const [
    prodToday,
    weekProd,
    weekStock,
    weekPetty,
    weekSaleRows,
    weekPurchaseRows,
  ] = await Promise.all([
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

  todayProductionCount = prodToday.reduce((sum, row) => sum + row._count, 0);
  addFormSlotsFromGroupBy(prodDays, weekProd);
  addFormSlotsFromGroupBy(stockDays, weekStock);
  addFormSlotsFromGroupBy(pettyDays, weekPetty);
  addFormSlotsFromGroupBy(saleDays, weekSaleRows);
  addFormSlotsFromGroupBy(purchaseDays, weekPurchaseRows);

  function shiftFilledForDate(date: string, shift: "DAY" | "NIGHT") {
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

  const perShiftFormTotal = multiPlant
    ? plants.length * TODAY_MODULE_COUNT
    : TODAY_MODULE_COUNT;

  const salesMap = new Map(
    weekSales.map((r) => [
      r.date.toISOString().slice(0, 10),
      toNum(r._sum.salesValue),
    ]),
  );
  const purchaseMap = new Map(
    weekPurchases.map((r) => [
      r.date.toISOString().slice(0, 10),
      toNum(r._sum.invoiceValue),
    ]),
  );

  const weekSeries: DayPoint[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStartStr, i);
    return {
      date,
      sales: salesMap.get(date) ?? 0,
      purchases: purchaseMap.get(date) ?? 0,
    };
  });
  const weekSalesTotal = weekSeries.reduce((sum, d) => sum + d.sales, 0);
  const weekPurchaseTotal = weekSeries.reduce((sum, d) => sum + d.purchases, 0);
  const weekSalesChangePct = pctChange(
    weekSalesTotal,
    toNum(prevWeekSalesAgg._sum.salesValue),
  );
  const weekPurchaseChangePct = pctChange(
    weekPurchaseTotal,
    toNum(prevWeekPurchaseAgg._sum.invoiceValue),
  );

  const statusByPlantShift = new Map<
    string,
    { DAY?: (typeof todayStatuses)[number]; NIGHT?: (typeof todayStatuses)[number] }
  >();
  for (const s of todayStatuses) {
    const bucket = statusByPlantShift.get(s.plantId) ?? {};
    if (s.shift === "DAY") bucket.DAY = s;
    else bucket.NIGHT = s;
    statusByPlantShift.set(s.plantId, bucket);
  }

  const todayStockRows = await prisma.stockEntry.groupBy({
    by: ["shift"],
    where: { ...entryFilter, date: todayDate },
    _count: true,
  });
  const todayPurchaseRows = await prisma.purchase.groupBy({
    by: ["shift"],
    where: { ...entryFilter, date: todayDate },
    _count: true,
  });
  const todaySaleRows = await prisma.sale.groupBy({
    by: ["shift"],
    where: { ...entryFilter, date: todayDate },
    _count: true,
  });
  const todayPettyRows = await prisma.pettyCashEntry.groupBy({
    by: ["shift"],
    where: { ...entryFilter, date: todayDate, entryType: "EXPENSE" },
    _count: true,
  });
  const todayProdRows = await prisma.productionEntry.groupBy({
    by: ["shift"],
    where: { ...entryFilter, date: todayDate },
    _count: true,
  });

  function shiftHasForm(
    rows: { shift: string; _count: number }[],
    shift: "DAY" | "NIGHT",
  ) {
    return rows.some((r) => r.shift === shift && r._count > 0);
  }

  const scopedTodayByShift = {
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

  const plantToday: PlantTodayRow[] = plants.map((plant) => {
    const bucket = statusByPlantShift.get(plant.id);
    const modules: PlantTodayModule[] = TODAY_MODULES.map((m) => ({
      key: m.key,
      label: m.label,
      href: m.href,
      color: m.color,
      filled: scoped
        ? scopedTodayByShift.DAY[m.key as keyof typeof scopedTodayByShift.DAY] ||
          scopedTodayByShift.NIGHT[m.key as keyof typeof scopedTodayByShift.NIGHT]
        : Boolean(bucket?.DAY?.[m.key] || bucket?.NIGHT?.[m.key]),
    }));
    const completed = modules.filter(
      (m) => m.filled && m.key !== "productionFilled",
    ).length;
    const dayComplete = bucket?.DAY?.allComplete ?? false;
    const nightComplete = bucket?.NIGHT?.allComplete ?? false;
    return {
      id: plant.id,
      name: plant.name,
      code: plant.code,
      completed,
      total: TODAY_MODULE_COUNT,
      allComplete: dayComplete && nightComplete,
      modules,
    };
  });

  const formBars: FormFillBar[] = TODAY_MODULES.map((m) => {
    const filled = scoped
      ? (scopedTodayByShift.DAY[m.key as keyof typeof scopedTodayByShift.DAY]
          ? 1
          : 0) +
        (scopedTodayByShift.NIGHT[m.key as keyof typeof scopedTodayByShift.NIGHT]
          ? 1
          : 0)
      : plantToday.filter((p) =>
          p.modules.some((mod) => mod.key === m.key && mod.filled),
        ).length;
    return {
      label: m.label,
      hrefSuffix: m.href,
      color: m.color,
      filled,
      total: scoped ? 2 : plants.length * 2,
    };
  });

  let formsFilled = 0;
  for (const row of plantToday) formsFilled += row.completed;
  if (scoped) {
    formsFilled =
      Object.values(scopedTodayByShift.DAY).filter(Boolean).length +
      Object.values(scopedTodayByShift.NIGHT).filter(Boolean).length;
  } else {
    for (const s of todayStatuses) {
      formsFilled += countStatusRequiredFilled(s);
    }
  }
  const formsTotal = scoped
    ? TODAY_MODULE_COUNT * 2
    : plants.length * TODAY_MODULE_COUNT * 2;

  function countStatusRequiredFilled(status: {
    purchaseFilled: boolean;
    saleFilled: boolean;
    stockFilled: boolean;
    pettyCashFilled: boolean;
  }) {
    return countRequiredShiftForms(status);
  }

  let statusSlots = 0;
  let statusFilled = 0;
  let daysWithSale = 0;
  let daysWithPurchase = 0;
  for (const s of statuses) {
    statusSlots += TODAY_MODULE_COUNT;
    statusFilled += countStatusRequiredFilled(s);
  }
  for (const p of weekSeries) {
    if (p.sales > 0) daysWithSale += 1;
    if (p.purchases > 0) daysWithPurchase += 1;
  }

  const weekCompletion = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStartStr, i);
    const slots = perShiftFormTotal * 2;
    if (slots === 0) return 0;
    const filled =
      shiftFilledForDate(date, "DAY") + shiftFilledForDate(date, "NIGHT");
    return Math.round((filled / slots) * 100);
  });

  let mtdNetProfit: number | null = null;
  if (options.includePnl) {
    const pnls = await Promise.all(
      plantIds.map((id) =>
        calculatePlantPnl(id, monthStart, todayDate, {
          enteredById: options.enteredById,
        }),
      ),
    );
    mtdNetProfit = pnls.reduce((sum, p) => sum + p.netProfit, 0);
  }

  const dailyReportRows: DailyReportRow[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, -i);
    const dayCompleted = shiftFilledForDate(date, "DAY");
    const nightCompleted = shiftFilledForDate(date, "NIGHT");
    const completed = dayCompleted + nightCompleted;
    const total = perShiftFormTotal * 2;
    return {
      date,
      completed,
      total: Math.max(total, TODAY_MODULE_COUNT * 2),
      allComplete:
        dayCompleted >= perShiftFormTotal &&
        nightCompleted >= perShiftFormTotal,
      dayShift: {
        completed: dayCompleted,
        total: Math.max(perShiftFormTotal, TODAY_MODULE_COUNT),
        allComplete: dayCompleted >= perShiftFormTotal,
      },
      nightShift: {
        completed: nightCompleted,
        total: Math.max(perShiftFormTotal, TODAY_MODULE_COUNT),
        allComplete: nightCompleted >= perShiftFormTotal,
      },
    };
  });

  const petty =
    toNum(todayPettyAgg._sum.amount) +
    toNum(todayPettyAgg._sum.contractorSalary) +
    toNum(todayPettyAgg._sum.supervisorSalary);

  const mtdExpenses =
    toNum(mtdPettyAgg._sum.amount) +
    toNum(mtdPettyAgg._sum.contractorSalary) +
    toNum(mtdPettyAgg._sum.supervisorSalary);

  return {
    today,
    monthLabel,
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
    kra: {
      dailyEntryRate:
        statusSlots > 0 ? Math.round((statusFilled / statusSlots) * 100) : 0,
      salesCoverage: Math.round((daysWithSale / 7) * 100),
      purchaseDiscipline: Math.round((daysWithPurchase / 7) * 100),
      checklistToday:
        formsTotal > 0 ? Math.round((formsFilled / formsTotal) * 100) : 0,
    },
  };
}
