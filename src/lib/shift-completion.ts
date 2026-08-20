import type { ManpowerShift } from "@prisma/client";
import { startOfUtcDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  REQUIRED_SHIFT_FORM_COUNT,
  REQUIRED_SHIFT_FORM_KEYS,
} from "@/lib/shift-forms";

export type ShiftKey = "DAY" | "NIGHT";

export const SHIFT_MODULE_DEFS = [
  { key: "purchaseFilled", label: "Purchase" },
  { key: "saleFilled", label: "Sales" },
  { key: "stockFilled", label: "Stock" },
  { key: "productionFilled", label: "Production" },
  { key: "pettyCashFilled", label: "Expense" },
] as const;

export type ShiftModuleKey = (typeof SHIFT_MODULE_DEFS)[number]["key"];

export type ShiftModuleStatus = {
  key: ShiftModuleKey;
  label: string;
  filled: boolean;
};

export type ShiftCompletion = {
  modules: ShiftModuleStatus[];
  completed: number;
  total: number;
  allComplete: boolean;
};

export async function computeShiftCompletion(params: {
  plantId: string;
  date: Date;
  shift: ShiftKey | ManpowerShift;
  enteredById?: string;
}): Promise<ShiftCompletion> {
  const day = startOfUtcDay(params.date);
  const where = {
    plantId: params.plantId,
    date: day,
    shift: params.shift as ManpowerShift,
    ...(params.enteredById ? { enteredById: params.enteredById } : {}),
  };

  const [purchaseN, saleN, stockN, productionN, expenseN] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.sale.count({ where }),
    prisma.stockEntry.count({ where }),
    prisma.productionEntry.count({ where }),
    prisma.pettyCashEntry.count({
      where: { ...where, entryType: "EXPENSE" },
    }),
  ]);

  const flags: Record<ShiftModuleKey, boolean> = {
    purchaseFilled: purchaseN > 0,
    saleFilled: saleN > 0,
    stockFilled: stockN > 0,
    productionFilled: productionN > 0,
    pettyCashFilled: expenseN > 0,
  };

  const modules = SHIFT_MODULE_DEFS.map((mod) => ({
    key: mod.key,
    label: mod.label,
    filled: flags[mod.key],
  }));

  const requiredModules = modules.filter((mod) =>
    (REQUIRED_SHIFT_FORM_KEYS as readonly string[]).includes(mod.key),
  );
  const completed = requiredModules.filter((m) => m.filled).length;

  return {
    modules,
    completed,
    total: REQUIRED_SHIFT_FORM_COUNT,
    allComplete: completed === REQUIRED_SHIFT_FORM_COUNT,
  };
}

export async function computeDayShiftCompletions(params: {
  plantId: string;
  date: Date;
  enteredById?: string;
}): Promise<Record<ShiftKey, ShiftCompletion>> {
  const [day, night] = await Promise.all([
    computeShiftCompletion({ ...params, shift: "DAY" }),
    computeShiftCompletion({ ...params, shift: "NIGHT" }),
  ]);
  return { DAY: day, NIGHT: night };
}
