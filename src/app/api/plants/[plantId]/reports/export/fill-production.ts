import type ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { iso, styleHeader, toNum, type DateFilter } from "./export-utils";

export async function fillProductionSheet(
  sheet: ExcelJS.Worksheet,
  opts: {
    pScope: Record<string, unknown>;
    byUser: Record<string, unknown>;
    dateFilter: DateFilter;
  },
) {
  const rows = await prisma.productionEntry.findMany({
    where: { ...opts.pScope, ...opts.byUser, ...opts.dateFilter },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  sheet.columns = [
    { header: "sNo.", key: "sno", width: 8 },
    { header: "Date", key: "date", width: 12 },
    { header: "Shift", key: "shift", width: 10 },
    { header: "Product name", key: "product", width: 28 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Qty", key: "qty", width: 12 },
  ];
  styleHeader(sheet.getRow(1));
  rows.forEach((r, i) => {
    sheet.addRow({
      sno: i + 1,
      date: iso(r.date),
      shift: r.shift,
      product: r.productName,
      unit: r.unit,
      qty: toNum(r.quantity),
    });
  });
}
