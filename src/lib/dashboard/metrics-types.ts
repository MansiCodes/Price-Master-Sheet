import { REQUIRED_SHIFT_FORM_COUNT } from "@/lib/shift-forms";
import type { DashboardPeriod } from "@/lib/dashboard/period";

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
  /** Electricity bill amount for the selected period. */
  electricityBill: number;
  /** Consumed meter units for the selected period. */
  electricityUnits: number;
  /** ₹ per consumed unit (0 if no units). */
  electricityPerUnit: number;
  /** Average units per calendar day in the period. */
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
  kra: {
    dailyEntryRate: number;
    salesCoverage: number;
    purchaseDiscipline: number;
    checklistToday: number;
  };
};
