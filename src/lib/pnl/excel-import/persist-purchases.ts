import { isBackdated, parseDateOnly } from "@/lib/dates";
import { round2 } from "@/lib/pnl/excel-import/cells";
import { purchaseSourceKey } from "@/lib/pnl/excel-import/dedupe";
import type { ParsedPnlWorkbook } from "@/lib/pnl/excel-import/parse";
import {
  approvalFor,
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
    const billRaw = row.billNumber?.trim() || "";

    let existing = null;
    if (billRaw) {
      existing = await prisma.purchase.findFirst({
        where: {
          ...pScope,
          billNumber: { equals: billRaw, mode: "insensitive" },
          ...(row.itemDescription?.trim()
            ? {
                itemDescription: {
                  equals: row.itemDescription.trim(),
                  mode: "insensitive",
                },
              }
            : {}),
        },
      });
      if (!existing) {
        existing = await prisma.purchase.findFirst({
          where: {
            ...pScope,
            billNumber: { equals: billRaw, mode: "insensitive" },
          },
        });
      }
    }

    if (!existing) {
      existing = await prisma.purchase.findFirst({
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
            },
          ],
        },
      });
    }

    const basicValue = round2(
      (row.quantity - (row.debitQuantity || 0)) * row.rate,
    );
    const gstAmount = round2(basicValue * (row.gstPercent / 100));
    const invoiceValue = round2(basicValue + gstAmount);

    if (existing) {
      await prisma.purchase.update({
        where: { id: existing.id },
        data: {
          date: day,
          shift: row.shift,
          type: row.type,
          typeOther: row.typeOther ?? existing.typeOther,
          vendorName: row.vendorName,
          billNumber: row.billNumber ?? existing.billNumber,
          billDate: row.billDate ? parseDateOnly(row.billDate) : existing.billDate,
          itemDescription: row.itemDescription,
          unit: row.unit || existing.unit,
          quantity: row.quantity,
          debitQuantity: row.debitQuantity || 0,
          rate: row.rate,
          basicValue,
          gstPercent: row.gstPercent,
          gstAmount,
          invoiceValue,
          gstin: row.gstin ?? existing.gstin,
          notes: row.notes ?? existing.notes,
          sourceKey: existing.sourceKey || sourceKey,
          excelUploadedAt: uploadedAt,
        },
      });
      summary.updated += 1;
      summary.skipped.push({
        sheet: "Purchase",
        row: row.row,
        reason: `Overwritten existing record (Invoice/Challan #${billRaw || row.vendorName})`,
      });
      daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
      continue;
    }

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
