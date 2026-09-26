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

    const existing = await prisma.sale.findFirst({
      where: {
        ...pScope,
        OR: [
          { sourceKey },
          { id: sourceKey },
          ...invoiceWhere.map((w) => ({
            ...w,
            date: day,
            quantity: row.quantity,
            rate: row.rate,
          })),
          {
            date: day,
            itemDescription: row.itemDescription,
            quantity: row.quantity,
          },
        ],
      },
      select: { id: true, billNumber: true },
    });

    const salesValue = round2(row.quantity * row.rate);

    if (existing) {
      const nextBill = preferFullerInvoice(existing.billNumber, billRaw);
      if (nextBill && nextBill !== (existing.billNumber ?? "").trim()) {
        await prisma.sale.update({
          where: { id: existing.id },
          data: {
            billNumber: nextBill,
            billDate: row.billDate ? parseDateOnly(row.billDate) : undefined,
            customerName: row.customerName,
            rate: row.rate,
            salesValue,
            excelUploadedAt: uploadedAt,
          },
        });
        await safeWriteAuditLog({
          entityType: "Sale",
          entityId: existing.id,
          field: "excel_import_update",
          oldValue: { billNumber: existing.billNumber },
          newValue: { billNumber: nextBill, excelUploadedAt: uploadedAt },
          actorId: enteredById,
          plantId: writePlantId,
        });
      }
      markDuplicate("Sales", row.row, "Already uploaded / merged with existing record");
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
