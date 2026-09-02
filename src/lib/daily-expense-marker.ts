import type { ManpowerShift } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  entryApprovalCreateData,
  entryApprovalResetOnEdit,
} from "@/lib/entry-approval";
import { safeRefreshDailyStatus } from "@/lib/daily-status";

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Mirror a daily expense on `pettyCashEntry` so shift completion / dashboard
 * checklist can mark the Expense module filled. P&L still prefers
 * `electricityRent` when present — this row is for daily tracking only.
 */
export async function syncDailyExpenseMarker(params: {
  plantId: string;
  date: Date;
  shift: ManpowerShift;
  expenseHead: string;
  amount: number;
  enteredById: string;
  description?: string | null;
  payMode?: string;
}) {
  if (!(params.amount > 0)) return;

  const day = startOfUtcDay(params.date);
  const payMode = params.payMode?.trim() || "Cash";

  const enteredBy = await prisma.user.findUnique({
    where: { id: params.enteredById },
    select: { globalRole: true },
  });
  if (!enteredBy) return;

  const existing = await prisma.pettyCashEntry.findFirst({
    where: {
      plantId: params.plantId,
      date: day,
      shift: params.shift,
      entryType: "EXPENSE",
      expenseHead: params.expenseHead,
    },
    select: { id: true },
  });

  const rowData = {
    payMode,
    amount: params.amount,
    description: params.description ?? null,
    contractorSalary: 0,
    supervisorSalary: 0,
  };

  if (existing) {
    const approvalReset = entryApprovalResetOnEdit(
      enteredBy.globalRole,
      day,
    );
    await prisma.pettyCashEntry.update({
      where: { id: existing.id },
      data: {
        ...rowData,
        ...approvalReset,
      },
    });
  } else {
    const approval = entryApprovalCreateData(enteredBy.globalRole, day);
    await prisma.pettyCashEntry.create({
      data: {
        plantId: params.plantId,
        date: day,
        shift: params.shift,
        entryType: "EXPENSE",
        expenseHead: params.expenseHead,
        enteredById: params.enteredById,
        ...rowData,
        ...approval,
        ...(approval.approvedByHead
          ? { approvedByHeadId: params.enteredById }
          : {}),
      },
    });
  }

  await safeRefreshDailyStatus(
    params.plantId,
    day,
    params.shift,
    params.enteredById,
  );
}

/** Non-fatal wrapper for electricity / rent saves. */
export async function safeSyncDailyExpenseMarker(
  params: Parameters<typeof syncDailyExpenseMarker>[0],
) {
  try {
    await syncDailyExpenseMarker(params);
  } catch (err) {
    console.error("syncDailyExpenseMarker failed", err);
  }
}
