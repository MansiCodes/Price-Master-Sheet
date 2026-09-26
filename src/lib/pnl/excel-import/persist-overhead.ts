import { syncDailyExpenseMarker } from "@/lib/daily-expense-marker";
import { round2 } from "@/lib/pnl/excel-import/cells";
import { farSourceKey } from "@/lib/pnl/excel-import/dedupe";
import type { ParsedPnlWorkbook } from "@/lib/pnl/excel-import/parse";
import { PVC_FAR_DEP_PERCENT } from "@/lib/plant-catalogs";
import type { PersistCtx } from "@/lib/pnl/excel-import/persist-types";

type ExpenseRow = ParsedPnlWorkbook["expenses"][number];

export async function persistElectricity(
  ctx: PersistCtx,
  row: ExpenseRow,
  day: Date,
  month: Date,
) {
  const { prisma, writePlantId, enteredById, uploadedAt, summary, markDuplicate } = ctx;
  const opening = row.openingReading;
  const closing = row.closingReading;
  const consumed =
    opening != null && closing != null
      ? Math.max(0, closing - opening)
      : null;
  const billAmount = round2(row.amount);

  const existing = await prisma.electricityRent.findUnique({
    where: { plantId_month: { plantId: writePlantId, month } },
    select: { billAmount: true },
  });
  if (
    existing &&
    Number(existing.billAmount) === billAmount &&
    billAmount > 0
  ) {
    markDuplicate("Electricity", row.row, "Already uploaded");
    return;
  }

  await prisma.electricityRent.upsert({
    where: { plantId_month: { plantId: writePlantId, month } },
    create: {
      plantId: writePlantId,
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
      plantId: writePlantId,
      date: day,
      shift: row.shift,
      expenseHead: row.expenseHead,
      amount: billAmount,
      enteredById,
      description: row.description,
      payMode: row.payMode,
      openingReading: row.openingReading,
      closingReading: row.closingReading,
    });
  } catch {
    /* best-effort */
  }
}

export async function persistRent(
  ctx: PersistCtx,
  row: ExpenseRow,
  day: Date,
  month: Date,
) {
  const { prisma, writePlantId, enteredById, uploadedAt, summary, markDuplicate } = ctx;
  const area = row.coveredAreaSqft;
  const rate = row.rentRatePerSqft;
  const rentAmount =
    row.amount > 0
      ? round2(row.amount)
      : area != null && rate != null
        ? round2(area * rate)
        : round2(row.amount);

  const existing = await prisma.electricityRent.findUnique({
    where: { plantId_month: { plantId: writePlantId, month } },
    select: { rentAmount: true },
  });
  if (
    existing &&
    Number(existing.rentAmount) === rentAmount &&
    rentAmount > 0
  ) {
    markDuplicate("Rent", row.row, "Already uploaded");
    return;
  }

  await prisma.electricityRent.upsert({
    where: { plantId_month: { plantId: writePlantId, month } },
    create: {
      plantId: writePlantId,
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
      plantId: writePlantId,
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
}

export async function persistFar(
  ctx: PersistCtx,
  row: ExpenseRow,
  day: Date,
) {
  const { prisma, writePlantId, familyKey, pScope, uploadedAt, summary, seenKeys, markDuplicate } = ctx;
  const cost = round2(row.cost ?? row.amount);
  const gst =
    row.gst != null ? round2(row.gst) : round2(cost * 0.18);
  const invoiceValue = round2(cost + gst);
  const dep = row.depreciationPercent ?? PVC_FAR_DEP_PERCENT;
  const sourceKey = farSourceKey(familyKey, {
    date: row.date,
    description: row.description || row.expenseHead,
    vendor: row.vendor,
    billNumber: row.billNumber,
    cost,
  });
  if (seenKeys.has(sourceKey)) {
    markDuplicate("FAR", row.row, "Duplicate row in this file");
    return;
  }
  seenKeys.add(sourceKey);

  const existing = await prisma.fixedAsset.findFirst({
    where: {
      ...pScope,
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
    return;
  }

  await prisma.fixedAsset.create({
    data: {
      plantId: writePlantId,
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
}
