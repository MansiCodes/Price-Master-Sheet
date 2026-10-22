import { isBackdated, parseDateOnly } from "@/lib/dates";
import { safeWriteAuditLog } from "@/lib/audit";
import { round2 } from "@/lib/pnl/excel-import/cells";
import {
  invoiceNumberMatchWhere,
  preferFullerInvoice,
  saleSourceKey,
} from "@/lib/pnl/excel-import/dedupe";
import type { ParsedPnlWorkbook } from "@/lib/pnl/excel-import/parse";
import { approvalFor, type PersistCtx } from "@/lib/pnl/excel-import/persist-types";

export async function persistSales(
  ctx: PersistCtx,
  sales: ParsedPnlWorkbook["sales"],
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

  for (const row of sales) {
    const sourceKey = saleSourceKey(familyKey, row);
    if (seenKeys.has(sourceKey)) {
      markDuplicate("Sales", row.row, "Duplicate row in this file");
      continue;
    }
    seenKeys.add(sourceKey);

    const day = parseDateOnly(row.date);
    const billRaw = row.billNumber?.trim() ?? "";
    const invoiceWhere = invoiceNumberMatchWhere(billRaw);

    let existing = null;
    if (billRaw) {
      if (row.itemDescription?.trim()) {
        existing = await prisma.sale.findFirst({
          where: {
            ...pScope,
            OR: invoiceWhere.map((w) => ({
              ...w,
              itemDescription: {
                equals: row.itemDescription.trim(),
                mode: "insensitive",
              },
            })),
          },
        });
      }
      if (!existing) {
        existing = await prisma.sale.findFirst({
          where: {
            ...pScope,
            OR: invoiceWhere,
          },
        });
      }
    }

    if (!existing) {
      existing = await prisma.sale.findFirst({
        where: {
          ...pScope,
          OR: [
            { sourceKey },
            { id: sourceKey },
            {
              date: day,
              customerName: row.customerName,
              itemDescription: row.itemDescription,
              quantity: row.quantity,
              rate: row.rate,
            },
          ],
        },
      });
    }

    const salesValue = round2(row.quantity * row.rate);

    if (existing) {
      const nextBill = preferFullerInvoice(existing.billNumber, billRaw);
      await prisma.sale.update({
        where: { id: existing.id },
        data: {
          date: day,
          shift: row.shift,
          type: row.type,
          typeOther: row.typeOther ?? existing.typeOther,
          customerName: row.customerName,
          billNumber: nextBill || existing.billNumber,
          billDate: row.billDate ? parseDateOnly(row.billDate) : existing.billDate,
          itemDescription: row.itemDescription,
          unit: row.unit || existing.unit,
          quantity: row.quantity,
          rate: row.rate,
          salesValue,
          inMeter: row.inMeter ?? existing.inMeter,
          qtyMtr: row.qtyMtr ?? existing.qtyMtr,
          meterUnit: row.meterUnit ?? existing.meterUnit,
          notes: row.notes ?? existing.notes,
          sourceKey: existing.sourceKey || sourceKey,
          excelUploadedAt: uploadedAt,
        },
      });

      await safeWriteAuditLog({
        entityType: "Sale",
        entityId: existing.id,
        field: "excel_import_update",
        oldValue: {
          billNumber: existing.billNumber,
          customerName: existing.customerName,
          quantity: String(existing.quantity),
          salesValue: String(existing.salesValue),
        },
        newValue: {
          billNumber: nextBill || existing.billNumber,
          customerName: row.customerName,
          quantity: String(row.quantity),
          salesValue: String(salesValue),
          excelUploadedAt: uploadedAt,
        },
        actorId: enteredById,
        plantId: writePlantId,
      });

      summary.updated += 1;
      summary.skipped.push({
        sheet: "Sales",
        row: row.row,
        reason: `Overwritten existing record (Invoice #${billRaw || row.customerName})`,
      });
      daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
      continue;
    }

    const approval = approvalFor(role, row.date);
    const createdSale = await prisma.sale.create({
      data: {
        id: sourceKey,
        sourceKey,
        plantId: writePlantId,
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

    await safeWriteAuditLog({
      entityType: "Sale",
      entityId: createdSale.id,
      field: "excel_import_create",
      newValue: {
        billNumber: createdSale.billNumber,
        customerName: createdSale.customerName,
        itemDescription: createdSale.itemDescription,
        quantity: String(createdSale.quantity),
        salesValue: String(createdSale.salesValue),
      },
      actorId: enteredById,
      plantId: writePlantId,
    });

    summary.sales += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }
}
