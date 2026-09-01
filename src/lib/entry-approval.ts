import { GlobalRole } from "@prisma/client";
import {
  dateOnlyRegex,
  parseDateOnly,
  startOfUtcDay,
  todayDateString,
} from "@/lib/dates";
import { isBusinessHead, isSuperAdmin } from "@/lib/rbac";
import type {
  EntryApprovalFlags,
  EntryApprovalKind,
  EntryApprovalRow,
} from "@/lib/entry-approval-types";

export type { EntryApprovalFlags, EntryApprovalKind, EntryApprovalRow } from "@/lib/entry-approval-types";

export const LEGACY_ENTRY_APPROVAL: EntryApprovalFlags = {
  approvedByHead: true,
  approvedByAdmin: true,
  rejectedByHead: false,
  rejectedByAdmin: false,
  approvalRequired: false,
};

/** Entries on/after this date require Business Head approval (per entry). */
export function getEntryApprovalStartDate(): Date {
  const raw = process.env.SHIFT_APPROVAL_START_DATE?.trim();
  if (raw && dateOnlyRegex.test(raw)) {
    return parseDateOnly(raw);
  }
  return parseDateOnly(todayDateString());
}

export function isEntryApprovalRequired(entryDate: Date | string): boolean {
  const day =
    typeof entryDate === "string"
      ? parseDateOnly(entryDate.slice(0, 10))
      : startOfUtcDay(entryDate);
  return day >= getEntryApprovalStartDate();
}

/** Business Head / Super Admin own entries skip the approval queue. */
export function shouldAutoApproveEntry(role: GlobalRole): boolean {
  return isBusinessHead(role) || isSuperAdmin(role);
}

export function isAutoApprovedEnterer(role: GlobalRole): boolean {
  return shouldAutoApproveEntry(role);
}

export function entryApprovalCreateData(
  role: GlobalRole,
  entryDate: Date | string,
): {
  approvedByHead: boolean;
  approvedByAdmin: boolean;
  approvedByHeadId?: string;
  rejectedByHead: boolean;
} {
  if (!isEntryApprovalRequired(entryDate) || shouldAutoApproveEntry(role)) {
    return {
      approvedByHead: true,
      approvedByAdmin: true,
      rejectedByHead: false,
    };
  }
  return {
    approvedByHead: false,
    approvedByAdmin: false,
    rejectedByHead: false,
  };
}

/** After an edit by a plant user, entry goes back to pending approval. */
export function entryApprovalResetOnEdit(
  role: GlobalRole,
  entryDate: Date | string,
): {
  approvedByHead: boolean;
  approvedByAdmin: boolean;
  approvedByHeadId: null;
  rejectedByHead: boolean;
  rejectionReason: null;
} | Record<string, never> {
  if (!isEntryApprovalRequired(entryDate) || shouldAutoApproveEntry(role)) {
    return {};
  }
  return {
    approvedByHead: false,
    approvedByAdmin: false,
    approvedByHeadId: null,
    rejectedByHead: false,
    rejectionReason: null,
  };
}

export function resolveEntryApprovalFlags(
  entry: EntryApprovalRow,
  enteredByRole?: GlobalRole | null,
): EntryApprovalFlags {
  if (!isEntryApprovalRequired(entry.date)) {
    return LEGACY_ENTRY_APPROVAL;
  }
  if (enteredByRole && shouldAutoApproveEntry(enteredByRole)) {
    return {
      approvedByHead: true,
      approvedByAdmin: true,
      rejectedByHead: false,
      rejectedByAdmin: false,
      approvalRequired: true,
    };
  }
  return {
    approvedByHead: entry.approvedByHead ?? false,
    approvedByAdmin: entry.approvedByHead ?? entry.approvedByAdmin ?? false,
    rejectedByHead: entry.rejectedByHead ?? false,
    rejectedByAdmin: false,
    approvalRequired: true,
  };
}

/** Prisma filter: legacy rows + approved rows on/after rollout. */
export function buildApprovedEntryWhere(
  from?: Date,
  to?: Date,
): Record<string, unknown> {
  const approvalStart = getEntryApprovalStartDate();
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

  const approvedFrom = from && from > approvalStart ? from : approvalStart;
  orClauses.push({
    date: {
      gte: approvedFrom,
      ...(to ? { lte: to } : {}),
    },
    approvedByHead: true,
    rejectedByHead: false,
  });
  orClauses.push({
    date: {
      gte: approvedFrom,
      ...(to ? { lte: to } : {}),
    },
    rejectedByHead: false,
    enteredBy: {
      globalRole: {
        in: [GlobalRole.BUSINESS_HEAD, GlobalRole.SUPER_ADMIN],
      },
    },
  });

  return { OR: orClauses };
}

export function pendingEntryWhere(from?: Date, to?: Date) {
  const approvalStart = getEntryApprovalStartDate();
  return {
    date: {
      gte: from && from > approvalStart ? from : approvalStart,
      ...(to ? { lte: to } : {}),
    },
    approvedByHead: false,
    rejectedByHead: false,
    enteredBy: {
      globalRole: {
        notIn: [GlobalRole.BUSINESS_HEAD, GlobalRole.SUPER_ADMIN],
      },
    },
  };
}
