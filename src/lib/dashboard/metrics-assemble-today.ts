import { countRequiredShiftForms } from "@/lib/shift-forms";
import {
  TODAY_MODULE_COUNT,
  TODAY_MODULES,
  type DailyReportRow,
  type FormFillBar,
  type PlantTodayModule,
  type PlantTodayRow,
} from "@/lib/dashboard/metrics-types";
import { addDays } from "@/lib/dashboard/metrics-helpers";
import type {
  AssemblePlant,
  AssembleStatusRow,
} from "@/lib/dashboard/metrics-assemble-types";
import {
  buildScopedTodayByShift,
  shiftFilledForDate,
} from "@/lib/dashboard/metrics-assemble-slots";

export function buildPlantToday(
  plants: AssemblePlant[],
  todayStatuses: AssembleStatusRow[],
  scoped: boolean,
  scopedTodayByShift: ReturnType<typeof buildScopedTodayByShift>,
): PlantTodayRow[] {
  const statusByPlantShift = new Map<
    string,
    { DAY?: AssembleStatusRow; NIGHT?: AssembleStatusRow }
  >();
  for (const s of todayStatuses) {
    const bucket = statusByPlantShift.get(s.plantId) ?? {};
    if (s.shift === "DAY") bucket.DAY = s;
    else bucket.NIGHT = s;
    statusByPlantShift.set(s.plantId, bucket);
  }

  return plants.map((plant) => {
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
}

export function buildFormBars(
  plantToday: PlantTodayRow[],
  scoped: boolean,
  scopedTodayByShift: ReturnType<typeof buildScopedTodayByShift>,
  plantCount: number,
): FormFillBar[] {
  return TODAY_MODULES.map((m) => {
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
      total: scoped ? 2 : plantCount * 2,
    };
  });
}

export function countFormsFilled(
  plantToday: PlantTodayRow[],
  todayStatuses: AssembleStatusRow[],
  scoped: boolean,
  scopedTodayByShift: ReturnType<typeof buildScopedTodayByShift>,
) {
  let formsFilled = 0;
  for (const row of plantToday) formsFilled += row.completed;
  if (scoped) {
    formsFilled =
      Object.values(scopedTodayByShift.DAY).filter(Boolean).length +
      Object.values(scopedTodayByShift.NIGHT).filter(Boolean).length;
  } else {
    for (const s of todayStatuses) {
      formsFilled += countRequiredShiftForms(s);
    }
  }
  return formsFilled;
}

export function buildDailyReportRows(
  today: string,
  plants: AssemblePlant[],
  multiPlant: boolean,
  purchaseDays: Set<string>,
  saleDays: Set<string>,
  stockDays: Set<string>,
  pettyDays: Set<string>,
): DailyReportRow[] {
  const perShiftFormTotal = multiPlant
    ? plants.length * TODAY_MODULE_COUNT
    : TODAY_MODULE_COUNT;
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, -i);
    const dayCompleted = shiftFilledForDate(
      date, "DAY", plants, multiPlant, purchaseDays, saleDays, stockDays, pettyDays,
    );
    const nightCompleted = shiftFilledForDate(
      date, "NIGHT", plants, multiPlant, purchaseDays, saleDays, stockDays, pettyDays,
    );
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
}
