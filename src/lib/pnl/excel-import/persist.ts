/**
 * Persist parsed P&L Excel rows into Prisma tables.
 * Skips rows that already exist (same content) — re-uploading the same file
 * or overlapping rows across files will not create duplicates.
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
import {
  expenseSourceKey,
  farSourceKey,
  purchaseSourceKey,
  saleSourceKey,
  stockSourceKey,
} from "@/lib/pnl/excel-import/dedupe";
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
  /** Rows skipped because the same data already exists. */
  duplicates: number;
  /** True when every row in the file was already present. */
  alreadyUploaded: boolean;
  skipped: { sheet: string; row: number; reason: string }[];
  sheetsFound: string[];
};

function approvalFor(role: GlobalRole, dateYmd: string) {
  return entryApprovalCreateData(role, dateYmd);
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
    duplicates: 0,
    alreadyUploaded: false,
    skipped: [...parsed.skipped],
    sheetsFound: parsed.sheetsFound,
  };

  const seenKeys = new Set<string>();
  const daysToRefresh = new Map<string, ManpowerShift>();

  function markDuplicate(sheet: string, row: number, reason: string) {
    summary.duplicates += 1;
    summary.skipped.push({ sheet, row, reason });
  }

  // ── Sales ──────────────────────────────────────────────────────────
  for (const row of parsed.sales) {
    const sourceKey = saleSourceKey(plantId, row);
    if (seenKeys.has(sourceKey)) {
      markDuplicate("Sales", row.row, "Duplicate row in this file");
      continue;
    }
    seenKeys.add(sourceKey);

    const day = parseDateOnly(row.date);
    const existing = await prisma.sale.findFirst({
      where: {
        plantId,
        OR: [
          { sourceKey },
          { id: sourceKey },
          {
            date: day,
            customerName: row.customerName,
            itemDescription: row.itemDescription,
            quantity: row.quantity,
            rate: row.rate,
            ...(row.billNumber ? { billNumber: row.billNumber } : {}),
          },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      markDuplicate("Sales", row.row, "Already uploaded");
      continue;
    }

    const salesValue = round2(row.quantity * row.rate);
    const approval = approvalFor(role, row.date);
    await prisma.sale.create({
      data: {
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
        inMeter: row.inMeter ?? null,
        qtyMtr: row.qtyMtr ?? null,
        meterUnit: row.meterUnit ?? null,
        notes: row.notes,
        enteredById,
        isBackdated: isBackdated(row.date),
        excelUploadedAt: uploadedAt,
        ...approval,
      },
    });
    summary.sales += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }

  // ── Purchases ──────────────────────────────────────────────────────
  for (const row of parsed.purchases) {
    const sourceKey = purchaseSourceKey(plantId, row);
    if (seenKeys.has(sourceKey)) {
      markDuplicate("Purchase", row.row, "Duplicate row in this file");
      continue;
    }
    seenKeys.add(sourceKey);

    const day = parseDateOnly(row.date);
    const existing = await prisma.purchase.findFirst({
      where: {
        plantId,
        OR: [
          { sourceKey },
          { id: sourceKey },
          {
            date: day,
            vendorName: row.vendorName,
            itemDescription: row.itemDescription,
            quantity: row.quantity,
            rate: row.rate,
            ...(row.billNumber ? { billNumber: row.billNumber } : {}),
          },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      markDuplicate("Purchase", row.row, "Already uploaded");
      continue;
    }

    const basicValue = round2(row.quantity * row.rate);
    const gstAmount = round2(basicValue * (row.gstPercent / 100));
    const invoiceValue = round2(basicValue + gstAmount);
    const approval = approvalFor(role, row.date);
    await prisma.purchase.create({
      data: {
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
    });
    summary.purchases += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }

  // ── Stock ──────────────────────────────────────────────────────────
  for (const row of parsed.stock) {
    const sourceKey = stockSourceKey(plantId, row);
    if (seenKeys.has(sourceKey)) {
      markDuplicate("Stock", row.row, "Duplicate row in this file");
      continue;
    }
    seenKeys.add(sourceKey);

    const day = parseDateOnly(row.date);
    const existing = await prisma.stockEntry.findFirst({
      where: {
        plantId,
        OR: [
          { sourceKey },
          {
            date: day,
            itemName: row.itemName,
            quantity: round4(row.quantity),
            rate: round4(row.rate),
          },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      markDuplicate("Stock", row.row, "Already uploaded");
      continue;
    }

    const closingValue = round2(row.quantity * row.rate);
    const approval = approvalFor(role, row.date);
    await prisma.stockEntry.create({
      data: {
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
      },
    });
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

      const existing = await prisma.electricityRent.findUnique({
        where: { plantId_month: { plantId, month } },
        select: { billAmount: true },
      });
      if (
        existing &&
        Number(existing.billAmount) === billAmount &&
        billAmount > 0
      ) {
        markDuplicate("Electricity", row.row, "Already uploaded");
        continue;
      }

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

      const existing = await prisma.electricityRent.findUnique({
        where: { plantId_month: { plantId, month } },
        select: { rentAmount: true },
      });
      if (
        existing &&
        Number(existing.rentAmount) === rentAmount &&
        rentAmount > 0
      ) {
        markDuplicate("Rent", row.row, "Already uploaded");
        continue;
      }

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
        row.gst != null ? round2(row.gst) : round2(cost * 0.18);
      const invoiceValue = round2(cost + gst);
      const dep = row.depreciationPercent ?? PVC_FAR_DEP_PERCENT;
      const sourceKey = farSourceKey(plantId, {
        date: row.date,
        description: row.description || row.expenseHead,
        vendor: row.vendor,
        billNumber: row.billNumber,
        cost,
      });
      if (seenKeys.has(sourceKey)) {
        markDuplicate("FAR", row.row, "Duplicate row in this file");
        continue;
      }
      seenKeys.add(sourceKey);

      const existing = await prisma.fixedAsset.findFirst({
        where: {
          plantId,
          OR: [
            {
              billNumber: row.billNumber ?? undefined,
              assetDescription: row.description || row.expenseHead,
            },
            {
              assetDescription: row.description || row.expenseHead,
              vendor: row.vendor ?? undefined,
              cost,
            },
          ],
        },
        select: { id: true },
      });
      if (existing) {
        markDuplicate("FAR", row.row, "Already uploaded");
        continue;
      }

      await prisma.fixedAsset.create({
        data: {
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
        },
      });
      summary.far += 1;
      continue;
    }

    // Petty / generic expense
    const sourceKey = expenseSourceKey(plantId, row);
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
        plantId,
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

  const imported =
    summary.sales +
    summary.purchases +
    summary.stock +
    summary.expenses +
    summary.electricity +
    summary.rent +
    summary.far;
  summary.alreadyUploaded = imported === 0 && summary.duplicates > 0;

  return summary;
}
