import type ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { iso, styleHeader, toNum, type DateFilter } from "./export-utils";

export async function fillPurchaseSheet(
  sheet: ExcelJS.Worksheet,
  opts: {
    pScope: Record<string, unknown>;
    byUser: Record<string, unknown>;
    dateFilter: DateFilter;
    cat6: boolean;
  },
) {
  const rows = await prisma.purchase.findMany({
    where: { ...opts.pScope, ...opts.byUser, ...opts.dateFilter },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  sheet.columns = opts.cat6
    ? [
        { header: "S.No", key: "sno", width: 8 },
        { header: "Books", key: "books", width: 12 },
        { header: "GSTIN/GST No", key: "gstin", width: 20 },
        { header: "Vendor's Name", key: "supplier", width: 26 },
        { header: "Bill Number", key: "billNo", width: 16 },
        { header: "Bill Date", key: "billDate", width: 12 },
        { header: "Item Details", key: "description", width: 26 },
        { header: "Item QTY", key: "qty", width: 12 },
        { header: "Debit Qty", key: "debitQty", width: 12 },
        { header: "Unit", key: "unit", width: 10 },
        { header: "Rate", key: "rate", width: 12 },
        { header: "Debit Amt", key: "debitValue", width: 14 },
        { header: "Purchase Amt", key: "basic", width: 14 },
        { header: "Notes", key: "notes", width: 20 },
      ]
    : [
        { header: "sNo.", key: "sno", width: 8 },
        { header: "Supplier name", key: "supplier", width: 26 },
        { header: "Description", key: "description", width: 22 },
        { header: "Invoice no. / Challan no.", key: "billNo", width: 20 },
        { header: "Bill date", key: "billDate", width: 12 },
        { header: "Unit", key: "unit", width: 10 },
        { header: "Qty", key: "qty", width: 12 },
        { header: "Debit Qty", key: "debitQty", width: 12 },
        { header: "Rate", key: "rate", width: 12 },
        { header: "Debit Value", key: "debitValue", width: 14 },
        { header: "Basic value", key: "basicGross", width: 14 },
        { header: "Net value (after debit)", key: "basic", width: 18 },
        { header: "GST %", key: "gstPct", width: 10 },
        { header: "GST amount", key: "gstAmt", width: 12 },
        { header: "Invoice value", key: "invoice", width: 14 },
        { header: "Remarks", key: "notes", width: 20 },
      ];
  styleHeader(sheet.getRow(1));
  rows.forEach((r, i) => {
    const debitQty = toNum(r.debitQuantity);
    const qty = toNum(r.quantity);
    const rate = toNum(r.rate);
    sheet.addRow({
      sno: i + 1,
      books: iso(r.booksDate),
      gstin: r.gstin ?? "",
      supplier: r.vendorName,
      description: r.itemDescription,
      billNo: r.billNumber ?? "",
      billDate: iso(r.billDate ?? r.date),
      unit: r.unit,
      qty,
      debitQty: debitQty > 0 ? debitQty : "",
      rate,
      debitValue: debitQty > 0 ? debitQty * rate : "",
      basicGross: qty * rate,
      basic: toNum(r.basicValue),
      gstPct: toNum(r.gstPercent),
      gstAmt: toNum(r.gstAmount),
      invoice: toNum(r.invoiceValue),
      notes: r.notes ?? "",
    });
  });
}
