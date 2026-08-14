import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import {
  requirePlantAccess,
  requireSession,
} from "@/lib/api";
import {
  dateOnlyRegex,
  parseDateOnly,
  todayDateString,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import { canViewPnl, isAdminOrHead } from "@/lib/rbac";
import { calculatePlantPnlStatement } from "@/lib/pnl/calculate";

type RouteContext = { params: Promise<{ plantId: string }> };

type ExportKind =
  | "pnl"
  | "sales"
  | "purchase"
  | "production"
  | "stock"
  | "expense";

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(String(v));
}

function iso(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0F766E" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFCCFBF1" },
  };
  row.alignment = { vertical: "middle" };
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const kind = (request.nextUrl.searchParams.get("kind") ??
    "pnl") as ExportKind;
  const fromStr =
    request.nextUrl.searchParams.get("from") ?? todayDateString();
  const toStr = request.nextUrl.searchParams.get("to") ?? fromStr;

  if (!dateOnlyRegex.test(fromStr) || !dateOnlyRegex.test(toStr)) {
    return NextResponse.json({ error: "Invalid from/to date" }, { status: 400 });
  }

  const from = parseDateOnly(fromStr);
  const to = parseDateOnly(toStr);
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true, name: true, code: true },
  });
  if (!plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Cable Junction";
  const sheet = workbook.addWorksheet(kind.toUpperCase());

  if (kind === "pnl") {
    if (!canViewPnl(session.user.globalRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const ownEntriesOnly = !isAdminOrHead(session.user.globalRole);
    const pnl = await calculatePlantPnlStatement(
      plantId,
      from,
      to,
      ownEntriesOnly ? { enteredById: session.user.id } : undefined,
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
  } else if (kind === "sales") {
    const rows = await prisma.sale.findMany({
      where: { plantId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    sheet.columns = [
      { header: "sNo.", key: "sno", width: 8 },
      { header: "Remarks", key: "notes", width: 24 },
      { header: "Invoice no.", key: "invoice", width: 16 },
      { header: "Bill date", key: "billDate", width: 12 },
      { header: "Product name", key: "product", width: 28 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Qty", key: "qty", width: 12 },
      { header: "Rate", key: "rate", width: 12 },
      { header: "Goods value", key: "goods", width: 14 },
    ];
    styleHeader(sheet.getRow(1));
    rows.forEach((r, i) => {
      sheet.addRow({
        sno: i + 1,
        notes: r.notes ?? "",
        invoice: r.billNumber ?? "",
        billDate: iso(r.billDate ?? r.date),
        product: r.itemDescription,
        unit: r.unit,
        qty: toNum(r.quantity),
        rate: toNum(r.rate),
        goods: toNum(r.salesValue),
      });
    });
  } else if (kind === "purchase") {
    const rows = await prisma.purchase.findMany({
      where: { plantId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    sheet.columns = [
      { header: "sNo.", key: "sno", width: 8 },
      { header: "Supplier name", key: "supplier", width: 26 },
      { header: "Description", key: "description", width: 22 },
      { header: "Bill no.", key: "billNo", width: 14 },
      { header: "Bill date", key: "billDate", width: 12 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Qty", key: "qty", width: 12 },
      { header: "Rate", key: "rate", width: 12 },
      { header: "Basic value", key: "basic", width: 14 },
      { header: "GST %", key: "gstPct", width: 10 },
      { header: "GST amount", key: "gstAmt", width: 12 },
      { header: "Invoice value", key: "invoice", width: 14 },
      { header: "Remarks", key: "notes", width: 20 },
    ];
    styleHeader(sheet.getRow(1));
    rows.forEach((r, i) => {
      sheet.addRow({
        sno: i + 1,
        supplier: r.vendorName,
        description: r.itemDescription,
        billNo: r.billNumber ?? "",
        billDate: iso(r.billDate ?? r.date),
        unit: r.unit,
        qty: toNum(r.quantity),
        rate: toNum(r.rate),
        basic: toNum(r.basicValue),
        gstPct: toNum(r.gstPercent),
        gstAmt: toNum(r.gstAmount),
        invoice: toNum(r.invoiceValue),
        notes: r.notes ?? "",
      });
    });
  } else if (kind === "production") {
    const rows = await prisma.productionEntry.findMany({
      where: { plantId, date: { gte: from, lte: to } },
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
  } else if (kind === "stock") {
    const rows = await prisma.stockEntry.findMany({
      where: { plantId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    sheet.columns = [
      { header: "sNo.", key: "sno", width: 8 },
      { header: "Date", key: "date", width: 12 },
      { header: "Shift", key: "shift", width: 10 },
      { header: "Item", key: "item", width: 22 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Qty", key: "qty", width: 12 },
      { header: "Value", key: "value", width: 14 },
    ];
    styleHeader(sheet.getRow(1));
    rows.forEach((r, i) => {
      sheet.addRow({
        sno: i + 1,
        date: iso(r.date),
        shift: r.shift,
        item: r.itemName,
        unit: r.unit,
        qty: toNum(r.quantity),
        value: toNum(r.closingValue),
      });
    });
  } else {
    const rows = await prisma.pettyCashEntry.findMany({
      where: { plantId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    sheet.columns = [
      { header: "sNo.", key: "sno", width: 8 },
      { header: "Date", key: "date", width: 12 },
      { header: "Shift", key: "shift", width: 10 },
      { header: "Category", key: "head", width: 18 },
      { header: "Description", key: "desc", width: 28 },
      { header: "Amount", key: "amount", width: 14 },
    ];
    styleHeader(sheet.getRow(1));
    rows.forEach((r, i) => {
      sheet.addRow({
        sno: i + 1,
        date: iso(r.date),
        shift: r.shift,
        head: r.expenseHead,
        desc: r.description ?? "",
        amount:
          toNum(r.amount) +
          toNum(r.contractorSalary) +
          toNum(r.supervisorSalary),
      });
    });
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const filename = `${plant.code}-${kind}-${fromStr}-to-${toStr}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
