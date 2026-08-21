import type { MachineProductionShift } from "@prisma/client";

export type SlotStatus = "PENDING" | "COMPLETED" | "OVERDUE";

export type ShiftFilter = "ALL" | "DAY" | "NIGHT";

export type SlotContext = {
  shift: MachineProductionShift;
  /** YYYY-MM-DD in Asia/Kolkata for the shift's business date */
  entryDate: string;
  slotStartHour: number;
  slotLabel: string;
  deadlineIso: string;
  deadlineLabel: string;
};

const TZ = "Asia/Kolkata";

export const DAY_SLOT_HOURS = [9, 13, 17] as const;
export const NIGHT_SLOT_HOURS = [21, 1, 5] as const;

export function formatHourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h12}${ampm}`;
}

export function slotWindowLabel(slotStartHour: number): string {
  const end = (slotStartHour + 4) % 24;
  return `${formatHourLabel(slotStartHour)}–${formatHourLabel(end)}`;
}

export function shiftDisplayLabel(shift: MachineProductionShift): string {
  return shift === "DAY" ? "Day (9AM–9PM)" : "Night (9PM–9AM)";
}

function istParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Add calendar days to a YYYY-MM-DD string (Gregorian). */
export function addDaysYmd(ymdStr: string, delta: number): string {
  const [y, m, d] = ymdStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d! + delta));
  return ymd(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

/** Instant for IST wall time on a calendar date. */
export function istWallToUtc(
  entryDate: string,
  hour: number,
  minute = 0,
  second = 0,
): Date {
  const iso = `${entryDate}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}+05:30`;
  return new Date(iso);
}

/**
 * Deadline = slot start + 4 hours.
 * Night slot 21 starts on entryDate 21:00 → deadline next day 01:00.
 * Night slots 1 and 5 start on entryDate+1 → deadline same day 05:00 / 09:00.
 */
export function slotDeadline(
  shift: MachineProductionShift,
  entryDate: string,
  slotStartHour: number,
): Date {
  if (shift === "DAY") {
    return istWallToUtc(entryDate, slotStartHour + 4);
  }
  if (slotStartHour === 21) {
    return istWallToUtc(addDaysYmd(entryDate, 1), 1);
  }
  // 1 → 5, 5 → 9 on the calendar day after entryDate
  return istWallToUtc(addDaysYmd(entryDate, 1), slotStartHour + 4);
}

export function buildSlotContext(
  shift: MachineProductionShift,
  entryDate: string,
  slotStartHour: number,
): SlotContext {
  const finalDeadline = slotDeadline(shift, entryDate, slotStartHour);
  const deadlineLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(finalDeadline);

  return {
    shift,
    entryDate,
    slotStartHour,
    slotLabel: slotWindowLabel(slotStartHour),
    deadlineIso: finalDeadline.toISOString(),
    deadlineLabel,
  };
}

export function resolveCurrentSlot(now = new Date()): SlotContext {
  const p = istParts(now);
  const today = ymd(p.year, p.month, p.day);
  const yesterday = addDaysYmd(today, -1);

  if (p.hour >= 9 && p.hour < 21) {
    const slotStartHour = p.hour < 13 ? 9 : p.hour < 17 ? 13 : 17;
    return buildSlotContext("DAY", today, slotStartHour);
  }

  if (p.hour >= 21) {
    return buildSlotContext("NIGHT", today, 21);
  }
  if (p.hour < 1) {
    return buildSlotContext("NIGHT", yesterday, 21);
  }
  if (p.hour < 5) {
    return buildSlotContext("NIGHT", yesterday, 1);
  }
  return buildSlotContext("NIGHT", yesterday, 5);
}

export function slotsForShift(shift: MachineProductionShift): readonly number[] {
  return shift === "DAY" ? DAY_SLOT_HOURS : NIGHT_SLOT_HOURS;
}

export function resolveSlotStatus(args: {
  submitted: boolean;
  deadlineIso: string;
  now?: Date;
}): SlotStatus {
  if (args.submitted) return "COMPLETED";
  const now = args.now ?? new Date();
  if (now.getTime() > new Date(args.deadlineIso).getTime()) return "OVERDUE";
  return "PENDING";
}

export function parseDateOnlyUtc(ymdStr: string): Date {
  const [y, m, d] = ymdStr.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function formatDateOnlyUtc(date: Date): string {
  return ymd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function efficiencyPct(planned: number, actual: number): number {
  if (!Number.isFinite(planned) || planned <= 0) return 0;
  return Math.round((actual / planned) * 10000) / 100;
}

export function todayIstYmd(now = new Date()): string {
  const p = istParts(now);
  return ymd(p.year, p.month, p.day);
}
