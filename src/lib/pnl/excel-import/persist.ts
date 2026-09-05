/**
 * Persist parsed P&L Excel rows into Prisma tables.
 * Auto-calcs mirror the create APIs (qty×rate, GST, closing value).
 */
import {
  GlobalRole,
  ManpowerShift,
  PettyCashKind,
  type PrismaClient,
} from "@prisma/client";
import { isBackdated, parseDateOnly } from "@/lib/dates";
import { entryApprovalCreateData } from "@/lib/entry-approval";
import { safeRefreshDailyStatus } from "@/lib/daily-status";
import { syncDailyExpenseMarker } from "@/lib/daily-expense-marker";
import {
  monthStart,
  round2,
  round4,
} from "@/lib/pnl/excel-import/cells";
import type { ParsedPnlWorkbook } from "@/lib/pnl/excel-import/parse";
import { PVC_FAR_DEP_PERCENT } from "@/lib/plant-catalogs";

export type ImportSummary = {
  batchId: string;
  uploadedAt: string;
  sales: number;
  purchases: number;
  stock: number;
  expenses: number;
  electricity: number;
  rent: number;
  far: number;
  skipped: { sheet: string; row: number; reason: string }[];
  sheetsFound: string[];
};

function approvalFor(role: GlobalRole, dateYmd: string) {
  const approval = entryApprovalCreateData(role, dateYmd);
  return {
    ...approval,
  };
}

export async function persistPnlImport(opts: {
  prisma: PrismaClient;
  plantId: string;
  enteredById: string;
  role: GlobalRole;
  parsed: ParsedPnlWorkbook;
  batchId: string;
  uploadedAt: Date;
}): Promise<ImportSummary> {
  const { prisma, plantId, enteredById, role, parsed, batchId, uploadedAt } =
    opts;

  const summary: ImportSummary = {
    batchId,
    uploadedAt: uploadedAt.toISOString(),
    sales: 0,
    purchases: 0,
    stock: 0,
    expenses: 0,
    electricity: 0,
    rent: 0,
    far: 0,
    skipped: [...parsed.skipped],
    sheetsFound: parsed.sheetsFound,
  };

  const daysToRefresh = new Map<string, ManpowerShift>();

  // ── Sales ──────────────────────────────────────────────────────────
  for (const row of parsed.sales) {
    const sourceKey = `excel-import:${batchId}:sale:${row.row}`;
    const salesValue = round2(row.quantity * row.rate);
    const day = parseDateOnly(row.date);
    const approval = approvalFor(role, row.date);
    await prisma.sale.upsert({
      where: { id: sourceKey },
      create: {
        id: sourceKey,
        sourceKey,
        plantId,
        date: day,
        shift: row.shift,
        type: row.type,
        typeOther: row.typeOther,
        customerName: row.customerName,
        billNumber: row.billNumber,
        billDate: row.billDate ? parseDateOnly(row.billDate) : null,
        itemDescription: row.itemDescription,
        unit: row.unit,
        quantity: row.quantity,
        rate: row.rate,
        salesValue,
        notes: row.notes,
        enteredById,
        isBackdated: isBackdated(row.date),
        excelUploadedAt: uploadedAt,
        ...approval,
      },
      update: {
        date: day,
        shift: row.shift,
        type: row.type,
        typeOther: row.typeOther,
        customerName: row.customerName,
        billNumber: row.billNumber,
        billDate: row.billDate ? parseDateOnly(row.billDate) : null,
        itemDescription: row.itemDescription,
        unit: row.unit,
        quantity: row.quantity,
        rate: row.rate,
        salesValue,
        notes: row.notes,
        excelUploadedAt: uploadedAt,
      },
    });
    summary.sales += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }

  // ── Purchases ──────────────────────────────────────────────────────
  for (const row of parsed.purchases) {
    const sourceKey = `excel-import:${batchId}:purchase:${row.row}`;
    const basicValue = round2(row.quantity * row.rate);
    const gstAmount = round2(basicValue * (row.gstPercent / 100));
    const invoiceValue = round2(basicValue + gstAmount);
    const day = parseDateOnly(row.date);
    const approval = approvalFor(role, row.date);
    await prisma.purchase.upsert({
      where: { id: sourceKey },
      create: {
        id: sourceKey,
        sourceKey,
        plantId,
        date: day,
        shift: row.shift,
        type: row.type,
        typeOther: row.typeOther,
        vendorName: row.vendorName,
        billNumber: row.billNumber,
        billDate: row.billDate ? parseDateOnly(row.billDate) : null,
        itemDescription: row.itemDescription,
        unit: row.unit,
        quantity: row.quantity,
        rate: row.rate,
        basicValue,
        gstPercent: row.gstPercent,
        gstAmount,
        invoiceValue,
        notes: row.notes,
        enteredById,
        isBackdated: isBackdated(row.date),
        excelUploadedAt: uploadedAt,
        ...approval,
      },
      update: {
        date: day,
        shift: row.shift,
        type: row.type,
        typeOther: row.typeOther,
        vendorName: row.vendorName,
        billNumber: row.billNumber,
        billDate: row.billDate ? parseDateOnly(row.billDate) : null,
        itemDescription: row.itemDescription,
        unit: row.unit,
        quantity: row.quantity,
        rate: row.rate,
        basicValue,
        gstPercent: row.gstPercent,
        gstAmount,
        invoiceValue,
        notes: row.notes,
        excelUploadedAt: uploadedAt,
      },
    });
    summary.purchases += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }

  // ── Stock ──────────────────────────────────────────────────────────
  for (const row of parsed.stock) {
    const sourceKey = `excel-import:${batchId}:stock:${row.row}`;
    const closingValue = round2(row.quantity * row.rate);
    const day = parseDateOnly(row.date);
    const approval = approvalFor(role, row.date);
    const existing = await prisma.stockEntry.findFirst({
      where: { sourceKey },
      select: { id: true },
    });
    const data = {
      sourceKey,
      plantId,
      date: day,
      shift: row.shift,
      itemName: row.itemName,
      category: row.category,
      unit: row.unit,
      quantity: round4(row.quantity),
      rate: round4(row.rate),
      closingValue,
      notes: row.notes,
      enteredById,
      isBackdated: isBackdated(row.date),
      excelUploadedAt: uploadedAt,
      ...approval,
    };
    if (existing) {
      await prisma.stockEntry.update({
        where: { id: existing.id },
        data: {
          date: day,
          shift: row.shift,
          itemName: row.itemName,
          category: row.category,
          unit: row.unit,
          quantity: round4(row.quantity),
          rate: round4(row.rate),
          closingValue,
          notes: row.notes,
          excelUploadedAt: uploadedAt,
        },
      });
    } else {
      await prisma.stockEntry.create({ data });
    }
    summary.stock += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }

  // ── Expenses (routed by head) ──────────────────────────────────────
  for (const row of parsed.expenses) {
    const day = parseDateOnly(row.date);
    const month = monthStart(day);

    if (row.target === "electricity") {
      const opening = row.openingReading;
      const closing = row.closingReading;
      const consumed =
        opening != null && closing != null
          ? Math.max(0, closing - opening)
          : null;
      const billAmount = round2(row.amount);

      await prisma.electricityRent.upsert({
        where: { plantId_month: { plantId, month } },
        create: {
          plantId,
          month,
          openingReading: opening,
          closingReading: closing,
          consumedUnits: consumed,
          billAmount,
          rentAmount: 0,
          notes: row.description,
          excelUploadedAt: uploadedAt,
        },
        update: {
          openingReading: opening ?? undefined,
          closingReading: closing ?? undefined,
          consumedUnits: consumed ?? undefined,
          billAmount,
          notes: row.description ?? undefined,
          excelUploadedAt: uploadedAt,
        },
      });
      summary.electricity += 1;
      try {
        await syncDailyExpenseMarker({
          plantId,
          date: day,
          shift: row.shift,
          expenseHead: row.expenseHead,
          amount: billAmount,
          enteredById,
          description: row.description,
          payMode: row.payMode,
        });
      } catch {
        /* best-effort */
      }
      continue;
    }

    if (row.target === "rent") {
      const area = row.coveredAreaSqft;
      const rate = row.rentRatePerSqft;
      const rentAmount =
        row.amount > 0
          ? round2(row.amount)
          : area != null && rate != null
            ? round2(area * rate)
            : round2(row.amount);

      await prisma.electricityRent.upsert({
        where: { plantId_month: { plantId, month } },
        create: {
          plantId,
          month,
          billAmount: 0,
          rentAmount,
          coveredAreaSqft: area,
          rentRatePerSqft: rate,
          notes: row.description,
          excelUploadedAt: uploadedAt,
        },
        update: {
          rentAmount,
          coveredAreaSqft: area ?? undefined,
          rentRatePerSqft: rate ?? undefined,
          notes: row.description ?? undefined,
          excelUploadedAt: uploadedAt,
        },
      });
      summary.rent += 1;
      try {
        await syncDailyExpenseMarker({
          plantId,
          date: day,
          shift: row.shift,
          expenseHead: row.expenseHead,
          amount: rentAmount,
          enteredById,
          description: row.description,
          payMode: row.payMode,
        });
      } catch {
        /* best-effort */
      }
      continue;
    }

    if (row.target === "far") {
      const cost = round2(row.cost ?? row.amount);
      const gst =
        row.gst != null
          ? round2(row.gst)
          : round2(cost * 0.18);
      const invoiceValue = round2(cost + gst);
      const dep =
        row.depreciationPercent ?? PVC_FAR_DEP_PERCENT;
      const sourceKey = `excel-import:${batchId}:far:${row.row}`;
      const existing = await prisma.fixedAsset.findFirst({
        where: {
          plantId,
          billNumber: row.billNumber ?? undefined,
          assetDescription: row.description || row.expenseHead,
        },
        select: { id: true },
      });
      const farData = {
        plantId,
        assetDescription: row.description || row.expenseHead,
        vendor: row.vendor,
        billNumber: row.billNumber,
        billDate: day,
        cost,
        gst,
        invoiceValue,
        depreciationPercent: dep,
        excelUploadedAt: uploadedAt,
      };
      if (existing) {
        await prisma.fixedAsset.update({
          where: { id: existing.id },
          data: farData,
        });
      } else {
        await prisma.fixedAsset.create({ data: farData });
      }
      void sourceKey;
      summary.far += 1;
      continue;
    }

    // Petty / generic expense
    const sourceKey = `excel-import:${batchId}:expense:${row.row}`;
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
    const isPetty =
      /petty/i.test(row.expenseHead) ||
      row.contractorSalary > 0 ||
      row.supervisorSalary > 0;
    await prisma.pettyCashEntry.upsert({
      where: { id: sourceKey },
      create: {
        id: sourceKey,
        sourceKey,
        plantId,
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
      update: {
        date: day,
        shift: row.shift,
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
        excelUploadedAt: uploadedAt,
      },
    });
    summary.expenses += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }

  for (const [key, shift] of daysToRefresh) {
    const dateYmd = key.split("|")[0]!;
    await safeRefreshDailyStatus(
      plantId,
      parseDateOnly(dateYmd),
      shift,
      enteredById,
    );
  }

  return summary;
}
