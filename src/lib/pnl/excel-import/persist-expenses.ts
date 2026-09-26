import { PettyCashKind } from "@prisma/client";
import { isBackdated, parseDateOnly } from "@/lib/dates";
import { monthStart, round2 } from "@/lib/pnl/excel-import/cells";
import { expenseSourceKey } from "@/lib/pnl/excel-import/dedupe";
import type { ParsedPnlWorkbook } from "@/lib/pnl/excel-import/parse";
import {
  persistElectricity,
  persistFar,
  persistRent,
} from "@/lib/pnl/excel-import/persist-overhead";
import { approvalFor, type PersistCtx } from "@/lib/pnl/excel-import/persist-types";

export async function persistExpenses(
  ctx: PersistCtx,
  expenses: ParsedPnlWorkbook["expenses"],
) {
  const {
    prisma,
    writePlantId,
    enteredById,
    role,
    familyKey,
    pScope,
    uploadedAt,
    summary,
    seenKeys,
    daysToRefresh,
    markDuplicate,
  } = ctx;

  for (const row of expenses) {
    const day = parseDateOnly(row.date);
    const month = monthStart(day);

    if (row.target === "electricity") {
      await persistElectricity(ctx, row, day, month);
      continue;
    }

    if (row.target === "rent") {
      await persistRent(ctx, row, day, month);
      continue;
    }

    if (row.target === "far") {
      await persistFar(ctx, row, day);
      continue;
    }

    const sourceKey = expenseSourceKey(familyKey, row);
    if (seenKeys.has(sourceKey)) {
      markDuplicate("Expense", row.row, "Duplicate row in this file");
      continue;
    }
    seenKeys.add(sourceKey);

    const approval = approvalFor(role, row.date);
    const total =
      row.amount + row.contractorSalary + row.supervisorSalary;
    if (!(total > 0)) {
      summary.skipped.push({
        sheet: "Expense",
        row: row.row,
        reason: "Expense amount is zero",
      });
      continue;
    }

    const existing = await prisma.pettyCashEntry.findFirst({
      where: {
        ...pScope,
        OR: [
          { sourceKey },
          { id: sourceKey },
          {
            date: day,
            expenseHead: row.nature || row.expenseHead,
            amount: round2(row.amount),
            ...(row.description
              ? { description: row.description }
              : {}),
          },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      markDuplicate("Expense", row.row, "Already uploaded");
      continue;
    }

    const isPetty =
      /petty/i.test(row.expenseHead) ||
      row.contractorSalary > 0 ||
      row.supervisorSalary > 0;
    await prisma.pettyCashEntry.create({
      data: {
        id: sourceKey,
        sourceKey,
        plantId: writePlantId,
        date: day,
        shift: row.shift,
        entryType: isPetty ? PettyCashKind.PETTY_CASH : PettyCashKind.EXPENSE,
        payMode: row.payMode || "Cash",
        expenseHead: row.nature || row.expenseHead,
        nature: row.nature,
        description: row.description,
        billNumber: row.billNumber,
        openingReading: row.openingReading,
        closingReading: row.closingReading,
        amount: round2(row.amount),
        contractorSalary: round2(row.contractorSalary),
        supervisorSalary: round2(row.supervisorSalary),
        enteredById,
        isBackdated: isBackdated(row.date),
        excelUploadedAt: uploadedAt,
        ...approval,
      },
    });
    summary.expenses += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }
}
