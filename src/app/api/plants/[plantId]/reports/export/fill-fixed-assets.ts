import type ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { iso, styleHeader, toNum } from "./export-utils";

export async function fillFixedAssetsSheet(
  sheet: ExcelJS.Worksheet,
  opts: {
    pScope: Record<string, unknown>;
    pnlFrom: Date;
    pnlTo: Date;
  },
) {
  const periodDays = (() => {
    const start = Date.UTC(
      opts.pnlFrom.getUTCFullYear(),
      opts.pnlFrom.getUTCMonth(),
      opts.pnlFrom.getUTCDate(),
    );
    const end = Date.UTC(
      opts.pnlTo.getUTCFullYear(),
      opts.pnlTo.getUTCMonth(),
      opts.pnlTo.getUTCDate(),
    );
    const ms = end - start;
    return Math.max(1, Math.floor(ms / 86_400_000) + 1);
  })();

  const rows = await prisma.fixedAsset.findMany({
    where: { ...opts.pScope },
    orderBy: { createdAt: "desc" },
  });

  sheet.columns = [
    { header: "S.No.", key: "sno", width: 8 },
    { header: "Asset", key: "asset", width: 36 },
    { header: "Vendor", key: "vendor", width: 20 },
    { header: "Cost", key: "cost", width: 14 },
    { header: "Dep %", key: "depPct", width: 12 },
    { header: "Depreciation Amt", key: "depAmt", width: 18 },
    { header: "Bill no.", key: "bill", width: 16 },
    { header: "Bill date", key: "billDate", width: 12 },
  ];
  styleHeader(sheet.getRow(1));

  rows.forEach((r, i) => {
    const annual = Number(r.cost) * (Number(r.depreciationPercent) / 100);
    const depAmt = (annual * periodDays) / 365;
    sheet.addRow({
      sno: i + 1,
      asset: r.assetDescription,
      vendor: r.vendor ?? "",
      cost: toNum(r.cost),
      depPct: Number(r.depreciationPercent),
      depAmt,
      bill: r.billNumber ?? "",
      billDate: iso(r.billDate),
    });
  });
}
