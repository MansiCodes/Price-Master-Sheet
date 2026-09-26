import type ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { iso, styleHeader, toNum, type DateFilter } from "./export-utils";

export async function fillSalesSheet(
  sheet: ExcelJS.Worksheet,
  opts: {
    pScope: { plantId?: string | { in: string[] } };
    byUser: Record<string, unknown>;
    dateFilter: DateFilter;
    cat6: boolean;
  },
) {
  const rows = await prisma.sale.findMany({
    where: {
      ...opts.pScope,
      ...opts.byUser,
      ...opts.dateFilter,
      ...(opts.cat6
        ? { NOT: { sourceKey: { endsWith: "sales-online:excel" } } }
        : {}),
    },
    orderBy: opts.cat6
      ? [{ date: "asc" }, { createdAt: "asc" }]
      : [{ date: "asc" }, { createdAt: "asc" }],
  });
  sheet.columns = opts.cat6
    ? [
        { header: "S.No", key: "sno", width: 8 },
        { header: "Customer Name", key: "customer", width: 28 },
        { header: "Bill Number", key: "invoice", width: 18 },
        { header: "Bill Date", key: "billDate", width: 12 },
        { header: "Item Details", key: "product", width: 32 },
        { header: "Quantity", key: "qty", width: 12 },
        { header: "Unit", key: "unit", width: 10 },
        { header: "Rate", key: "rate", width: 12 },
        { header: "Sales Value", key: "goods", width: 14 },
        { header: "In Meter", key: "inMeter", width: 12 },
        { header: "QTY-MTR", key: "qtyMtr", width: 12 },
        { header: "Unit (MTR)", key: "meterUnit", width: 10 },
      ]
    : [
        { header: "sNo.", key: "sno", width: 8 },
        { header: "Customer", key: "customer", width: 24 },
        { header: "Remarks", key: "notes", width: 24 },
        { header: "Invoice no.", key: "invoice", width: 16 },
        { header: "Bill date", key: "billDate", width: 12 },
        { header: "Item Details", key: "product", width: 28 },
        { header: "Unit", key: "unit", width: 10 },
        { header: "Qty", key: "qty", width: 12 },
        { header: "Rate", key: "rate", width: 12 },
        { header: "Goods value", key: "goods", width: 14 },
      ];
  styleHeader(sheet.getRow(1));
  rows.forEach((r, i) => {
    sheet.addRow({
      sno: i + 1,
      customer: r.customerName,
      notes: r.notes ?? "",
      invoice: r.billNumber ?? "",
      billDate: iso(r.billDate ?? r.date),
      product: r.itemDescription,
      unit: r.unit,
      qty: toNum(r.quantity),
      rate: toNum(r.rate),
      goods: toNum(r.salesValue),
      inMeter: r.inMeter == null ? "" : toNum(r.inMeter),
      qtyMtr: r.qtyMtr == null ? "" : toNum(r.qtyMtr),
      meterUnit: r.meterUnit ?? "",
    });
  });
}
