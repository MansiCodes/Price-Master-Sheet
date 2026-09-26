import type ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { isQuadSignalPlant } from "@/lib/plant-layout";
import { parseQuadSignalStockNotes } from "@/lib/plant-catalogs";
import { parsePutupKm } from "@/lib/stock-production-status";
import {
  QUAD_STOCK_PROCESS_HEADERS,
  QUAD_STOCK_SHEET_HEADERS,
} from "@/lib/pnl/excel-import/quad-stock-columns";
import { iso, styleHeader, toNum, type DateFilter } from "./export-utils";

export async function fillStockSheet(
  sheet: ExcelJS.Worksheet,
  opts: {
    pScope: Record<string, unknown>;
    byUser: Record<string, unknown>;
    dateFilter: DateFilter;
    plantCode: string;
  },
) {
  const isPvc = opts.plantCode.toUpperCase() === "PVC";
  const isQuad = isQuadSignalPlant(opts.plantCode);
  const rows = await prisma.stockEntry.findMany({
    where: {
      ...opts.pScope,
      ...opts.byUser,
      ...opts.dateFilter,
      ...(isPvc ? { notes: { startsWith: "Closing stock" } } : {}),
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  if (isPvc) {
    sheet.columns = [
      { header: "S.No.", key: "sno", width: 8 },
      { header: "Date", key: "date", width: 12 },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Particulars", key: "particulars", width: 28 },
      { header: "Closing Stock", key: "qty", width: 16 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Rate", key: "rate", width: 12 },
      { header: "Closing Value", key: "value", width: 16 },
    ];
    styleHeader(sheet.getRow(1));
    rows.forEach((r, i) => {
      sheet.addRow({
        sno: i + 1,
        date: iso(r.date),
        stock: r.category,
        particulars: r.itemName,
        qty: toNum(r.quantity),
        unit: r.unit,
        rate: toNum(r.rate),
        value: toNum(r.closingValue),
      });
    });
  } else if (isQuad) {
    const dbStockOrders = await (prisma as any).plantStockOrder.findMany({
      where: opts.pScope,
    });
    // Same headers as import template / Today Entry / P&L Stock.
    const widthByHeader: Record<string, number> = {
      Date: 12,
      Shift: 10,
      "Stock type": 14,
      Item: 28,
      Size: 18,
      Unit: 10,
      Qty: 12,
      Rate: 12,
      Value: 14,
      "Drum length": 14,
      "Call putup": 14,
      "Put up date": 12,
      "Party name": 22,
      "Dispatch pending": 14,
      "Dispatch party": 22,
      Balance: 14,
      Notes: 28,
    };
    sheet.columns = QUAD_STOCK_SHEET_HEADERS.map((header) => ({
      header,
      key: header,
      width: widthByHeader[header] ?? 12,
    }));
    styleHeader(sheet.getRow(1));
    rows.forEach((r) => {
      const { meta, userNotes } = parseQuadSignalStockNotes(r.notes);
      let type = r.category === "FG" ? "Cable" : "Raw Material";
      let item = r.itemName;
      let size = "";
      const processVals: Record<string, number | ""> = {};
      for (const h of QUAD_STOCK_PROCESS_HEADERS) processVals[h] = "";
      let drumLength = "";
      let callPutup = "";
      let putupDate = "";
      let partyName = "";
      let dispatchPending: number | "" = "";
      let dispatchParty = "";
      let balanceVal: number | "" = "";

      if (meta?.kind === "cable") {
        type = "Cable";
        item = meta.cable || r.itemName;
        size = meta.size || "";
        const production = meta.production ?? {};
        for (const [name, val] of Object.entries(production)) {
          const match = QUAD_STOCK_PROCESS_HEADERS.find(
            (h) => h.toLowerCase() === name.toLowerCase(),
          );
          if (match && val != null) processVals[match] = val;
        }
        drumLength = meta.calcSnapshot?.drumLabel ?? "";
        callPutup = meta.callPutup ?? "";
        putupDate = meta.putupDate ?? "";
        partyName = meta.partyName ?? "";
        if (meta.dispatchPending != null) dispatchPending = meta.dispatchPending;
        dispatchParty = meta.dispatchParty ?? "";

        const putupKmTotal = Array.isArray(meta.callPutupItems) && meta.callPutupItems.length > 0
          ? meta.callPutupItems.reduce((s, i) => s + (Number(i.qty) || 0), 0)
          : parsePutupKm(meta.callPutup);

        const stockTotal = Object.entries(production).reduce((s, [name, val]) => {
          const n = name.trim().toLowerCase();
          if (n === "insulation" || n === "single quad") return s;
          return s + (Number(val) || 0);
        }, 0);

        const matchedOrders = dbStockOrders.filter(
          (o: any) =>
            o.cable?.trim().toLowerCase() === item.trim().toLowerCase() &&
            o.size?.trim().toLowerCase() === size.trim().toLowerCase(),
        );
        const orderQty = matchedOrders.reduce(
          (s: number, o: any) => s + (Number(o.qty) || 0),
          0,
        );
        if (orderQty > 0 || putupKmTotal > 0 || stockTotal > 0) {
          balanceVal = Math.round((orderQty - putupKmTotal - stockTotal) * 1000) / 1000;
        }
      } else if (meta?.kind === "raw") {
        type = "Raw Material";
        item = r.itemName;
      } else {
        const parts = r.itemName.split(" · ");
        item = parts[0] || r.itemName;
        size = parts.slice(1).join(" · ");
      }
      sheet.addRow({
        Date: iso(r.date),
        Shift: r.shift ?? "",
        "Stock type": type,
        Item: item,
        Size: size,
        Unit: r.unit,
        Qty: toNum(r.quantity),
        Rate: toNum(r.rate),
        Value: toNum(r.closingValue),
        "Drum length": drumLength,
        "Call putup": callPutup,
        "Put up date": putupDate,
        "Party name": partyName,
        "Dispatch pending": dispatchPending,
        "Dispatch party": dispatchParty,
        Balance: balanceVal,
        Notes: userNotes,
        ...processVals,
      });
    });
  } else {
    sheet.columns = [
      { header: "S.No.", key: "sno", width: 8 },
      { header: "Date", key: "date", width: 12 },
      { header: "Category", key: "category", width: 12 },
      { header: "Item", key: "item", width: 22 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Qty", key: "qty", width: 12 },
      { header: "Rate", key: "rate", width: 12 },
      { header: "Value", key: "value", width: 14 },
    ];
    styleHeader(sheet.getRow(1));
    rows.forEach((r, i) => {
      sheet.addRow({
        sno: i + 1,
        date: iso(r.date),
        category: r.category,
        item: r.itemName,
        unit: r.unit,
        qty: toNum(r.quantity),
        rate: toNum(r.rate),
        value: toNum(r.closingValue),
      });
    });
  }
}
