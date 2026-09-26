import { isBackdated, parseDateOnly } from "@/lib/dates";
import { round2 } from "@/lib/pnl/excel-import/cells";
import { purchaseSourceKey } from "@/lib/pnl/excel-import/dedupe";
import type { ParsedPnlWorkbook } from "@/lib/pnl/excel-import/parse";
import {
  approvalFor,
  isBlankText,
  type PersistCtx,
} from "@/lib/pnl/excel-import/persist-types";

export async function persistPurchases(
  ctx: PersistCtx,
  purchases: ParsedPnlWorkbook["purchases"],
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

  for (const row of purchases) {
    const sourceKey = purchaseSourceKey(familyKey, row);
    if (seenKeys.has(sourceKey)) {
      markDuplicate("Purchase", row.row, "Duplicate row in this file");
      continue;
    }
    seenKeys.add(sourceKey);

    const day = parseDateOnly(row.date);
    const existing = await prisma.purchase.findFirst({
      where: {
        ...pScope,
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
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        notes: true,
        gstin: true,
        unit: true,
        typeOther: true,
        debitQuantity: true,
        sourceKey: true,
      },
    });
    if (existing) {
      const patch: {
        billNumber?: string | null;
        billDate?: Date | null;
        notes?: string | null;
        gstin?: string | null;
        unit?: string;
        typeOther?: string | null;
        debitQuantity?: number;
        sourceKey?: string;
        excelUploadedAt?: Date;
      } = {};

      if (isBlankText(existing.billNumber) && !isBlankText(row.billNumber)) {
        patch.billNumber = row.billNumber;
      }
      if (existing.billDate == null && row.billDate) {
        patch.billDate = parseDateOnly(row.billDate);
      }
      if (isBlankText(existing.notes) && !isBlankText(row.notes)) {
        patch.notes = row.notes;
      }
      if (isBlankText(existing.gstin) && !isBlankText(row.gstin)) {
        patch.gstin = row.gstin;
      }
      if (isBlankText(existing.typeOther) && !isBlankText(row.typeOther)) {
        patch.typeOther = row.typeOther;
      }
      const existingUnit = (existing.unit ?? "").trim();
      const incomingUnit = (row.unit ?? "").trim();
      if (
        incomingUnit &&
        (isBlankText(existingUnit) ||
          (existingUnit.toLowerCase() === "kg" &&
            incomingUnit.toLowerCase() !== "kg"))
      ) {
        patch.unit = incomingUnit;
      }
      const existingDebit = Number(existing.debitQuantity ?? 0);
      if (
        (!(existingDebit > 0) || !Number.isFinite(existingDebit)) &&
        row.debitQuantity > 0
      ) {
        patch.debitQuantity = row.debitQuantity;
      }
      if (isBlankText(existing.sourceKey) && sourceKey) {
        patch.sourceKey = sourceKey;
      }

      if (Object.keys(patch).length > 0) {
        patch.excelUploadedAt = uploadedAt;
        await prisma.purchase.update({
          where: { id: existing.id },
          data: patch,
        });
        summary.updated += 1;
        summary.skipped.push({
          sheet: "Purchase",
          row: row.row,
          reason: "Duplicate — filled missing fields",
        });
        daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
      } else {
        markDuplicate("Purchase", row.row, "Already uploaded");
      }
      continue;
    }

    const basicValue = round2(
      (row.quantity - (row.debitQuantity || 0)) * row.rate,
    );
    const gstAmount = round2(basicValue * (row.gstPercent / 100));
    const invoiceValue = round2(basicValue + gstAmount);
    const approval = approvalFor(role, row.date);
    await prisma.purchase.create({
      data: {
        id: sourceKey,
        sourceKey,
        plantId: writePlantId,
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
        debitQuantity: row.debitQuantity || 0,
        rate: row.rate,
        basicValue,
        gstPercent: row.gstPercent,
        gstAmount,
        invoiceValue,
        gstin: row.gstin,
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
}
