/** Calendar date helpers (YYYY-MM-DD) using IST by default. */

const IST = "Asia/Kolkata";

/** Today's date as YYYY-MM-DD in the given timezone (default IST). */
export function todayDateString(timeZone: string = IST): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Parse YYYY-MM-DD into a UTC midnight Date (safe for Prisma @db.Date). */
export function parseDateOnly(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return new Date(Date.UTC(y, m - 1, d));
}

/** True when the entry date is before today (IST calendar compare). */
export function isBackdated(dateStr: string, timeZone: string = IST): boolean {
  return dateStr < todayDateString(timeZone);
}

export const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type Ymd = { y: number; m: number; d: number };

function ymdFromUnknown(value: string | Date | null | undefined): Ymd | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      y: value.getUTCFullYear(),
      m: value.getUTCMonth() + 1,
      d: value.getUTCDate(),
    };
  }
  const raw = String(value).trim();
  const iso = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(raw);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3] ?? 1);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return { y, m, d };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    y: parsed.getUTCFullYear(),
    m: parsed.getUTCMonth() + 1,
    d: parsed.getUTCDate(),
  };
}

/** YYYY-MM-DD, or empty when the value is not a real date. */
export function toIsoDateString(value: string | Date | null | undefined): string {
  const parts = ymdFromUnknown(value);
  if (!parts) return "";
  return `${parts.y}-${String(parts.m).padStart(2, "0")}-${String(parts.d).padStart(2, "0")}`;
}

/** Register month label: Jan-26. Never returns "Invalid Date". */
export function formatMonthLabel(value: string | Date | null | undefined): string {
  const parts = ymdFromUnknown(value);
  if (!parts) return "—";
  return `${MONTHS_SHORT[parts.m - 1]}-${String(parts.y).slice(-2)}`;
}

/** Register day label: 05-Aug-26. Never returns "Invalid Date". */
export function formatDayMonthYear(value: string | Date | null | undefined): string {
  const parts = ymdFromUnknown(value);
  if (!parts) return "—";
  return `${String(parts.d).padStart(2, "0")}-${MONTHS_SHORT[parts.m - 1]}-${String(parts.y).slice(-2)}`;
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in Asia/Kolkata, as UTC midnight for Prisma `@db.Date`. */
export function todayIstAsUtcDate(now: Date = new Date()): Date {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseDateOnly(dateStr);
}

/**
 * 9:00 PM Asia/Kolkata on the given calendar date (`date` is UTC-midnight
 * of that day). Equals 15:30 UTC the same calendar day.
 */
export function ninePmIstOnDate(date: Date): Date {
  const day = parseDateOnly(toDateString(date));
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      15,
      30,
      0,
      0,
    ),
  );
}

export function isPastNinePmIst(now: Date = new Date()): boolean {
  return now.getTime() >= ninePmIstOnDate(todayIstAsUtcDate(now)).getTime();
}

/** Start of calendar day as UTC midnight (matches Prisma `@db.Date` usage). */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
