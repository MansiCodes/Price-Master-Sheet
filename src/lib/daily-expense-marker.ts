import type { ManpowerShift } from "@prisma/client";
import { prisma } from "@/lib/db";
import { refreshDailyStatus } from "@/lib/daily-status";

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
  const payMode = params.payMode?.trim() || "CASH";

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
    await prisma.pettyCashEntry.update({
      where: { id: existing.id },
      data: rowData,
    });
  } else {
    await prisma.pettyCashEntry.create({
      data: {
        plantId: params.plantId,
        date: day,
        shift: params.shift,
        entryType: "EXPENSE",
        expenseHead: params.expenseHead,
        enteredById: params.enteredById,
        ...rowData,
      },
    });
  }

  await refreshDailyStatus(params.plantId, day, params.shift, params.enteredById);
}
