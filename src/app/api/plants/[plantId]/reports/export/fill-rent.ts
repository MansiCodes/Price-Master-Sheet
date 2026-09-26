import type ExcelJS from "exceljs";
import { formatMonthLabel } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { startOfUtcMonth, styleHeader, toNum, type ExportKind } from "./export-utils";

export async function fillRentSheet(
  sheet: ExcelJS.Worksheet,
  opts: {
    kind: Extract<ExportKind, "electricityRent" | "factoryRent">;
    pScope: Record<string, unknown>;
    plantCode: string;
    from: Date | null;
    to: Date | null;
  },
) {
  const rentOnly = opts.kind === "factoryRent";
  const isPvc = opts.plantCode.toUpperCase() === "PVC";
  const monthFilter =
    rentOnly || (!opts.from && !opts.to)
      ? {}
      : {
          month: {
            ...(opts.from ? { gte: startOfUtcMonth(opts.from) } : {}),
            ...(opts.to ? { lte: startOfUtcMonth(opts.to) } : {}),
          },
        };
  const rows = await prisma.electricityRent.findMany({
    where: { ...opts.pScope, ...monthFilter },
    orderBy: { month: "asc" },
  });
  sheet.columns =
    rentOnly
      ? [
          { header: "S.No", key: "sno", width: 8 },
          { header: "Months", key: "month", width: 14 },
          { header: "Covered Area", key: "area", width: 16 },
          { header: "Rate", key: "rentRate", width: 12 },
          { header: "Rent Exp", key: "rent", width: 14 },
        ]
      : isPvc
        ? [
            { header: "S.No.", key: "sno", width: 8 },
            { header: "Months", key: "month", width: 14 },
            { header: "Opening Reading", key: "opening", width: 16 },
            { header: "Closing Reading", key: "closing", width: 16 },
            { header: "Consumed Reading", key: "consumed", width: 16 },
            { header: "Avg rate", key: "avg", width: 12 },
            { header: "Amount of electricity bill", key: "bill", width: 22 },
            { header: "Notes / Remark", key: "notes", width: 28 },
          ]
        : [
            { header: "S.No.", key: "sno", width: 8 },
            { header: "Month", key: "month", width: 14 },
            { header: "Opening", key: "opening", width: 14 },
            { header: "Closing", key: "closing", width: 14 },
            { header: "Consumed", key: "consumed", width: 14 },
            { header: "Avg rate", key: "avg", width: 12 },
            { header: "Electricity Bill", key: "bill", width: 18 },
            { header: "Rent Expense", key: "rent", width: 16 },
            { header: "Notes", key: "notes", width: 22 },
          ];
  styleHeader(sheet.getRow(1));
  rows.forEach((r, i) => {
    sheet.addRow({
      sno: i + 1,
      month: formatMonthLabel(r.month),
      opening: r.openingReading == null ? "" : toNum(r.openingReading),
      closing: r.closingReading == null ? "" : toNum(r.closingReading),
      consumed: r.consumedUnits == null ? "" : toNum(r.consumedUnits),
      avg:
        r.consumedUnits != null && toNum(r.consumedUnits) > 0 && toNum(r.billAmount) > 0
          ? toNum(r.billAmount) / toNum(r.consumedUnits)
          : "",
      bill: toNum(r.billAmount),
      area:
        r.coveredAreaSqft == null
          ? ""
          : `${toNum(r.coveredAreaSqft)} SQFT`,
      rentRate: r.rentRatePerSqft == null ? "" : toNum(r.rentRatePerSqft),
      rent: toNum(r.rentAmount),
      notes: r.notes ?? "",
    });
  });
}
