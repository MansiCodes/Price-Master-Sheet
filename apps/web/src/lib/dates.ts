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
