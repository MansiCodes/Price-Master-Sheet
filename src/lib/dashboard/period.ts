import { parseDateOnly, todayDateString } from "@/lib/dates";

export type DashboardPeriod = "week" | "month" | "quarter" | "year";

export const DASHBOARD_PERIODS: DashboardPeriod[] = [
  "week",
  "month",
  "quarter",
  "year",
];

export function parseDashboardPeriod(raw?: string | null): DashboardPeriod {
  if (
    raw === "week" ||
    raw === "month" ||
    raw === "quarter" ||
    raw === "year"
  ) {
    return raw;
  }
  return "month";
}

function addDays(dateStr: string, days: number): string {
  const d = parseDateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type PeriodBounds = {
  period: DashboardPeriod;
  periodStart: Date;
  periodEnd: Date;
  periodStartStr: string;
  periodEndStr: string;
  previousStart: Date;
  previousEnd: Date;
  bucketKeys: string[];
  bucketGranularity: "day" | "week" | "month";
};

export function getDashboardPeriodBounds(
  period: DashboardPeriod,
  today = todayDateString(),
): PeriodBounds {
  const periodEnd = parseDateOnly(today);
  const y = periodEnd.getUTCFullYear();
  const m = periodEnd.getUTCMonth();

  let periodStart: Date;
  let bucketGranularity: PeriodBounds["bucketGranularity"];
  let bucketKeys: string[];

  if (period === "week") {
    const periodStartStr = addDays(today, -6);
    periodStart = parseDateOnly(periodStartStr);
    bucketGranularity = "day";
    bucketKeys = Array.from({ length: 7 }, (_, i) => addDays(periodStartStr, i));
  } else if (period === "month") {
    periodStart = new Date(Date.UTC(y, m, 1));
    bucketGranularity = "day";
    const startStr = periodStart.toISOString().slice(0, 10);
    const days =
      Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
    bucketKeys = Array.from({ length: days }, (_, i) => addDays(startStr, i));
  } else if (period === "quarter") {
    const qMonth = Math.floor(m / 3) * 3;
    periodStart = new Date(Date.UTC(y, qMonth, 1));
    bucketGranularity = "week";
    bucketKeys = [];
    let cursor = new Date(periodStart);
    while (cursor <= periodEnd) {
      bucketKeys.push(cursor.toISOString().slice(0, 10));
      cursor = new Date(cursor.getTime() + 7 * 86400000);
    }
    if (bucketKeys.length === 0) {
      bucketKeys.push(periodStart.toISOString().slice(0, 10));
    }
  } else {
    periodStart = new Date(Date.UTC(y, 0, 1));
    bucketGranularity = "month";
    bucketKeys = Array.from({ length: m + 1 }, (_, i) =>
      `${y}-${String(i + 1).padStart(2, "0")}`,
    );
  }

  const periodStartStr = periodStart.toISOString().slice(0, 10);
  const periodDays =
    Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
  const previousEndStr = addDays(periodStartStr, -1);
  const previousStartStr = addDays(previousEndStr, -(periodDays - 1));

  return {
    period,
    periodStart,
    periodEnd,
    periodStartStr,
    periodEndStr: today,
    previousStart: parseDateOnly(previousStartStr),
    previousEnd: parseDateOnly(previousEndStr),
    bucketKeys,
    bucketGranularity,
  };
}

export function bucketDateForPeriod(
  dateStr: string,
  granularity: PeriodBounds["bucketGranularity"],
  periodStart: Date,
): string {
  if (granularity === "day") return dateStr;
  const d = parseDateOnly(dateStr);
  if (granularity === "month") {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  const diffDays = Math.floor(
    (d.getTime() - periodStart.getTime()) / 86400000,
  );
  const weekIndex = Math.max(0, Math.floor(diffDays / 7));
  const weekStart = new Date(
    periodStart.getTime() + weekIndex * 7 * 86400000,
  );
  return weekStart.toISOString().slice(0, 10);
}

export function formatPeriodLabel(
  period: DashboardPeriod,
  bounds: PeriodBounds,
): string {
  const end = bounds.periodEnd;
  if (period === "week") return "Last 7 days";
  if (period === "month") {
    return end.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (period === "quarter") {
    const q = Math.floor(end.getUTCMonth() / 3) + 1;
    return `Q${q} ${end.getUTCFullYear()}`;
  }
  return String(end.getUTCFullYear());
}
