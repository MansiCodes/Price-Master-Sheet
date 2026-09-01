import { dateOnlyRegex, parseDateOnly, startOfUtcDay, todayDateString } from "@/lib/dates";

/** Kept for metrics/export helpers; approval workflow is disabled. */
export function getShiftApprovalStartDate(): Date {
  const raw = process.env.SHIFT_APPROVAL_START_DATE?.trim();
  if (raw && dateOnlyRegex.test(raw)) {
    return parseDateOnly(raw);
  }
  // Default: approval applies from today (IST) when env is not set.
  return parseDateOnly(todayDateString());
}

export type ShiftApprovalFlags = {
  approvedByHead: boolean;
  approvedByAdmin: boolean;
  rejectedByHead: boolean;
  rejectedByAdmin: boolean;
  approvalRequired: boolean;
  shiftComplete: boolean;
};

export const LEGACY_SHIFT_APPROVAL: ShiftApprovalFlags = {
  approvedByHead: true,
  approvedByAdmin: true,
  rejectedByHead: false,
  rejectedByAdmin: false,
  approvalRequired: false,
  shiftComplete: true,
};

/** @deprecated use isEntryApprovalRequired from entry-approval */
export function isShiftApprovalRequired(entryDate: Date | string): boolean {
  const day =
    typeof entryDate === "string"
      ? parseDateOnly(entryDate.slice(0, 10))
      : startOfUtcDay(entryDate);
  return day >= getShiftApprovalStartDate();
}

export function resolveShiftApprovalFlags(
  entryDate: Date | string,
  status?: Partial<Omit<ShiftApprovalFlags, "approvalRequired" | "shiftComplete">> & {
    allComplete?: boolean;
  } | null,
): ShiftApprovalFlags {
  if (!isShiftApprovalRequired(entryDate)) {
    return LEGACY_SHIFT_APPROVAL;
  }
  return {
    approvedByHead: status?.approvedByHead ?? false,
    approvedByAdmin: status?.approvedByHead ?? status?.approvedByAdmin ?? false,
    rejectedByHead: status?.rejectedByHead ?? false,
    rejectedByAdmin: status?.rejectedByAdmin ?? false,
    approvalRequired: true,
    shiftComplete: true,
  };
}

export function shiftStatusKey(date: Date, shift: string): string {
  return `${date.toISOString().slice(0, 10)}_${shift}`;
}

export function getRowApprovalFlags(
  date: Date,
  shift: string,
  statusMap: Map<
    string,
    Partial<Omit<ShiftApprovalFlags, "approvalRequired" | "shiftComplete">> & {
      allComplete?: boolean;
    }
  >,
): ShiftApprovalFlags {
  return resolveShiftApprovalFlags(date, statusMap.get(shiftStatusKey(date, shift)));
}

/**
 * Prisma filter: include legacy entries (before rollout) plus approved shifts
 * on/after rollout when `approvedOnly` is enabled.
 */
export function buildApprovedEntryOrFilter(params: {
  approvalStart: Date;
  from?: Date;
  to?: Date;
  approvedShifts: { date: Date; shift: string }[];
}): { OR: Array<Record<string, unknown>> } | { id: "none" } {
  const { approvalStart, from, to, approvedShifts } = params;
  const orClauses: Array<Record<string, unknown>> = [];

  if (!from || from < approvalStart) {
    orClauses.push({
      date: {
        ...(from ? { gte: from } : {}),
        lt: approvalStart,
        ...(to && to < approvalStart ? { lte: to } : {}),
      },
    });
  }

  for (const s of approvedShifts) {
    orClauses.push({ date: s.date, shift: s.shift });
  }

  return orClauses.length > 0 ? { OR: orClauses } : { id: "none" };
}
