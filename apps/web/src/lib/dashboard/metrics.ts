import { prisma } from "@/lib/db";
import { parseDateOnly, todayDateString } from "@/lib/dates";
import { refreshDailyStatus } from "@/lib/daily-status";
import { calculatePlantPnl } from "@/lib/pnl/calculate";

export type DayPoint = { date: string; sales: number; purchases: number };

export const TODAY_MODULES = [
  { key: "purchaseFilled" as const, label: "Purchase", href: "today", color: "#0d9488" },
  { key: "saleFilled" as const, label: "Sales", href: "today", color: "#b45309" },
  { key: "manpowerFilled" as const, label: "Production", href: "today", color: "#0284c7" },
  { key: "pettyCashFilled" as const, label: "Expense", href: "today", color: "#ef6351" },
  { key: "stockFilled" as const, label: "Stock check", href: "today", color: "#7c3aed" },
];

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

function toNum(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

function addDays(dateStr: string, days: number): string {
  const d = parseDateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getDashboardMetrics(
  plantIds: string[],
  options: { includePnl: boolean },
): Promise<DashboardMetrics> {
  const today = todayDateString();
  const todayDate = parseDateOnly(today);
  const weekStartStr = addDays(today, -6);
  const weekStart = parseDateOnly(weekStartStr);
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
    formsTotalToday: Math.max(1, plantIds.length) * 5,
    plantsTracked: plantIds.length,
    weekSeries: Array.from({ length: 7 }, (_, i) => ({
      date: addDays(weekStartStr, i),
      sales: 0,
      purchases: 0,
    })),
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

  const plantFilter = { plantId: { in: plantIds } };

  const plants = await prisma.plant.findMany({
    where: { id: { in: plantIds }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  await Promise.all(
    plants.map(async (plant) => {
      const existing = await prisma.dailyEntryStatus.findUnique({
        where: { plantId_date: { plantId: plant.id, date: todayDate } },
      });
      if (!existing) await refreshDailyStatus(plant.id, todayDate);
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
    statuses,
    todayStatuses,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...plantFilter, date: todayDate },
      _sum: { salesValue: true },
    }),
    prisma.purchase.aggregate({
      where: { ...plantFilter, date: todayDate },
      _sum: { invoiceValue: true },
    }),
    prisma.pettyCashEntry.aggregate({
      where: { ...plantFilter, date: todayDate },
      _sum: { amount: true, contractorSalary: true, supervisorSalary: true },
    }),
    prisma.sale.aggregate({
      where: { ...plantFilter, date: { gte: monthStart, lte: todayDate } },
      _sum: { salesValue: true },
    }),
    prisma.purchase.aggregate({
      where: { ...plantFilter, date: { gte: monthStart, lte: todayDate } },
      _sum: { invoiceValue: true },
    }),
    prisma.pettyCashEntry.aggregate({
      where: { ...plantFilter, date: { gte: monthStart, lte: todayDate } },
      _sum: { amount: true, contractorSalary: true, supervisorSalary: true },
    }),
    prisma.manpowerEntry.aggregate({
      where: { ...plantFilter, date: { gte: monthStart, lte: todayDate } },
      _sum: { totalCost: true },
    }),
    prisma.stockEntry.aggregate({
      where: { ...plantFilter, date: { gte: monthStart, lte: todayDate } },
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
          where: { ...plantFilter, date: { gte: monthStart, lte: todayDate } },
          _sum: { quantity: true },
        })
      : Promise.resolve({ _sum: { quantity: 0 } }),
    prisma.sale.groupBy({
      by: ["date"],
      where: { ...plantFilter, date: { gte: weekStart, lte: todayDate } },
      _sum: { salesValue: true },
    }),
    prisma.purchase.groupBy({
      by: ["date"],
      where: { ...plantFilter, date: { gte: weekStart, lte: todayDate } },
      _sum: { invoiceValue: true },
    }),
    prisma.dailyEntryStatus.findMany({
      where: { ...plantFilter, date: { gte: weekStart, lte: todayDate } },
      select: {
        plantId: true,
        date: true,
        purchaseFilled: true,
        saleFilled: true,
        stockFilled: true,
        manpowerFilled: true,
        pettyCashFilled: true,
        allComplete: true,
      },
    }),
    prisma.dailyEntryStatus.findMany({
      where: { ...plantFilter, date: todayDate },
      select: {
        plantId: true,
        purchaseFilled: true,
        saleFilled: true,
        stockFilled: true,
        manpowerFilled: true,
        pettyCashFilled: true,
        allComplete: true,
      },
    }),
  ]);

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

  const statusByPlant = new Map(todayStatuses.map((s) => [s.plantId, s]));

  const plantToday: PlantTodayRow[] = plants.map((plant) => {
    const s = statusByPlant.get(plant.id);
    const modules: PlantTodayModule[] = TODAY_MODULES.map((m) => ({
      key: m.key,
      label: m.label,
      href: m.href,
      color: m.color,
      filled: Boolean(s?.[m.key]),
    }));
    const completed = modules.filter((m) => m.filled).length;
    return {
      id: plant.id,
      name: plant.name,
      code: plant.code,
      completed,
      total: 5,
      allComplete: Boolean(s?.allComplete) || completed === 5,
      modules,
    };
  });

  const formBars: FormFillBar[] = TODAY_MODULES.map((m) => {
    const filled = plantToday.filter((p) =>
      p.modules.some((mod) => mod.key === m.key && mod.filled),
    ).length;
    return {
      label: m.label,
      hrefSuffix: m.href,
      color: m.color,
      filled,
      total: plants.length,
    };
  });

  let formsFilled = 0;
  for (const row of plantToday) formsFilled += row.completed;
  const formsTotal = plants.length * 5;

  let statusSlots = 0;
  let statusFilled = 0;
  let daysWithSale = 0;
  let daysWithPurchase = 0;
  for (const s of statuses) {
    statusSlots += 5;
    statusFilled += [
      s.purchaseFilled,
      s.saleFilled,
      s.stockFilled,
      s.manpowerFilled,
      s.pettyCashFilled,
    ].filter(Boolean).length;
  }
  for (const p of weekSeries) {
    if (p.sales > 0) daysWithSale += 1;
    if (p.purchases > 0) daysWithPurchase += 1;
  }

  const weekCompletion = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStartStr, i);
    const dayRows = statuses.filter(
      (s) => s.date.toISOString().slice(0, 10) === date,
    );
    if (plants.length === 0) return 0;
    let filled = 0;
    for (const s of dayRows) {
      filled += [
        s.purchaseFilled,
        s.saleFilled,
        s.stockFilled,
        s.manpowerFilled,
        s.pettyCashFilled,
      ].filter(Boolean).length;
    }
    return Math.round((filled / (plants.length * 5)) * 100);
  });

  let mtdNetProfit: number | null = null;
  if (options.includePnl) {
    const pnls = await Promise.all(
      plantIds.map((id) => calculatePlantPnl(id, monthStart, todayDate)),
    );
    mtdNetProfit = pnls.reduce((sum, p) => sum + p.netProfit, 0);
  }

  const dailyReportRows: DailyReportRow[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, -i);
    const dayRows = statuses.filter(
      (s) => s.date.toISOString().slice(0, 10) === date,
    );
    const total = plants.length * 5;
    let completed = 0;
    let allComplete = plants.length > 0;
    for (const plant of plants) {
      const row = dayRows.find((s) => s.plantId === plant.id);
      const filled = row
        ? [
            row.purchaseFilled,
            row.saleFilled,
            row.stockFilled,
            row.manpowerFilled,
            row.pettyCashFilled,
          ].filter(Boolean).length
        : 0;
      completed += filled;
      if (filled < 5) allComplete = false;
    }
    return {
      date,
      completed,
      total: Math.max(total, 5),
      allComplete: allComplete && completed >= Math.max(total, 5),
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
