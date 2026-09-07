import { parseDateOnly, todayDateString } from "@/lib/dates";

export type DashboardPeriod = "day" | "week" | "month" | "year";

export const DASHBOARD_PERIODS: DashboardPeriod[] = [
  "day",
  "week",
  "month",
  "year",
];

export function parseDashboardPeriod(raw?: string | null): DashboardPeriod {
  if (
    raw === "day" ||
    raw === "week" ||
    raw === "month" ||
    raw === "year"
  ) {
    return raw;
  }
  // Legacy bookmark: quarterly → monthly
  if (raw === "quarter") return "month";
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
  /** Calendar days in the selected period (inclusive). */
  periodDayCount: number;
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

  if (period === "day") {
    periodStart = parseDateOnly(today);
    bucketGranularity = "day";
    bucketKeys = [today];
  } else if (period === "week") {
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
  } else {
    periodStart = new Date(Date.UTC(y, 0, 1));
    bucketGranularity = "month";
    bucketKeys = Array.from({ length: m + 1 }, (_, i) =>
      `${y}-${String(i + 1).padStart(2, "0")}`,
    );
  }

  const periodStartStr = periodStart.toISOString().slice(0, 10);
  const periodDayCount =
    Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
  const previousEndStr = addDays(periodStartStr, -1);
  const previousStartStr = addDays(previousEndStr, -(periodDayCount - 1));

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
    periodDayCount,
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
  if (period === "day") {
    return end.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (period === "week") return "Last 7 days";
  if (period === "month") {
    return end.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return String(end.getUTCFullYear());
}
