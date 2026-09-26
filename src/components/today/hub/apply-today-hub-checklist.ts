import type {
  ShiftKey,
  ShiftModulesMap,
  TodayModuleKey,
  TodayModuleStatus,
} from "@/components/today/today-hub-model";

export type ChecklistJson = {
  shifts?: Record<ShiftKey, { modules: { key: TodayModuleKey; filled: boolean }[] }>;
  customSuppliers?: string[];
  customCustomers?: string[];
  customPurchaseItems?: string[];
  customSaleItems?: string[];
  customStockItems?: string[];
  customFarVendors?: string[];
  customUnits?: string[];
};

function mergeChecklistShift(
  mods: TodayModuleStatus[],
  remoteMods: { key: TodayModuleKey; filled: boolean }[] | undefined,
) {
  return mods.map((mod) => {
    const remote = remoteMods?.find((m) => m.key === mod.key);
    const filled = remote?.filled ?? mod.filled;
    return {
      ...mod,
      filled,
      done: filled ? Math.max(1, mod.total ?? 1) : 0,
      total: mod.total ?? 1,
    };
  });
}

export function mergeShiftModulesPreserveFilled(
  prev: ShiftModulesMap,
  shiftModules: ShiftModulesMap,
): ShiftModulesMap {
  return {
    DAY: shiftModules.DAY.map((next) => {
      const current = prev.DAY.find((m) => m.key === next.key);
      if (current?.filled && !next.filled) return current;
      return next;
    }),
    NIGHT: shiftModules.NIGHT.map((next) => {
      const current = prev.NIGHT.find((m) => m.key === next.key);
      if (current?.filled && !next.filled) return current;
      return next;
    }),
  };
}

export function applyChecklistShifts(
  prev: ShiftModulesMap,
  json: ChecklistJson,
): ShiftModulesMap {
  return {
    DAY: mergeChecklistShift(prev.DAY, json.shifts?.DAY.modules),
    NIGHT: mergeChecklistShift(prev.NIGHT, json.shifts?.NIGHT.modules),
  };
}

export function markShiftModuleFilled(
  prev: ShiftModulesMap,
  moduleKey: TodayModuleKey,
  entryShift: ShiftKey,
): ShiftModulesMap {
  return {
    ...prev,
    [entryShift]: prev[entryShift].map((mod) =>
      mod.key === moduleKey
        ? { ...mod, filled: true, done: 1, total: mod.total ?? 1 }
        : mod,
    ),
  };
}

export async function fetchTodayChecklistJson(plantId: string, date: string) {
  try {
    const res = await fetch(
      `/api/plants/${plantId}/today?date=${encodeURIComponent(date)}`,
    );
    if (!res.ok) return undefined;
    return (await res.json()) as ChecklistJson;
  } catch {
    /* keep optimistic state */
    return undefined;
  }
}
