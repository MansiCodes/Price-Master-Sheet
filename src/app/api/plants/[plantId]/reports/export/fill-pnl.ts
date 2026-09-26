import { NextResponse } from "next/server";
import type ExcelJS from "exceljs";
import type { GlobalRole } from "@prisma/client";
import { calculatePlantPnlStatement } from "@/lib/pnl/calculate";
import { canViewFullPnl, seesOwnEntriesOnly, usesSuperAdminPnlScope } from "@/lib/rbac";
import { styleHeader } from "./export-utils";

export async function fillPnlSheet(
  sheet: ExcelJS.Worksheet,
  opts: {
    plantId: string;
    pnlFrom: Date;
    pnlTo: Date;
    globalRole: GlobalRole;
    userId: string;
  },
) {
  if (!canViewFullPnl(opts.globalRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ownEntriesOnly = seesOwnEntriesOnly(opts.globalRole);
  const pnl = await calculatePlantPnlStatement(
    opts.plantId,
    opts.pnlFrom,
    opts.pnlTo,
    {
      ...(ownEntriesOnly ? { enteredById: opts.userId } : {}),
      approvedOnly: usesSuperAdminPnlScope(opts.globalRole),
    },
  );
  sheet.columns = [
    { header: "Section", key: "section", width: 16 },
    { header: "Side", key: "side", width: 10 },
    { header: "Particulars", key: "label", width: 36 },
    { header: "Amount", key: "amount", width: 16 },
    { header: "Ratio %", key: "ratio", width: 12 },
  ];
  styleHeader(sheet.getRow(1));
  for (const [section, block] of [
    ["Trading", pnl.trading],
    ["Indirect", pnl.indirect],
  ] as const) {
    for (const side of ["debit", "credit"] as const) {
      for (const line of block[side]) {
        if (line.kind === "blank") continue;
        if (line.amount == null && (line.kind === "profit" || line.kind === "tax")) {
          continue;
        }
        sheet.addRow({
          section,
          side: side === "debit" ? "Debit" : "Credit",
          label: line.label,
          amount: line.amount ?? "",
          ratio: line.ratio ?? "",
        });
      }
    }
    sheet.addRow({
      section,
      side: "",
      label: "TOTAL",
      amount: block.total,
      ratio: "",
    });
  }
  return null;
}
