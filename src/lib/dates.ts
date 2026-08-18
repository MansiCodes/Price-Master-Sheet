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

export function getIstHoursMinutes(now: Date = new Date()): {
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

/**
 * Shifts run 9:00–21:00 (Day) and 21:00–09:00 (Night) IST.
 * Reminders go out ~10 minutes before the matching start.
 */
export function reminderShiftForNow(
  now: Date = new Date(),
): "DAY" | "NIGHT" | null {
  const { hour, minute } = getIstHoursMinutes(now);
  const minutes = hour * 60 + minute;
  const morningStart = 8 * 60;
  const morningEnd = 10 * 60;
  const eveningStart = 20 * 60;
  const eveningEnd = 22 * 60 + 30;
  if (minutes >= morningStart && minutes < morningEnd) return "DAY";
  if (minutes >= eveningStart && minutes < eveningEnd) return "NIGHT";
  return null;
}

/** Start of calendar day as UTC midnight (matches Prisma `@db.Date` usage). */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
