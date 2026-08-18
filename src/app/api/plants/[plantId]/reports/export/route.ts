import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { PettyCashKind } from "@prisma/client";
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
import { CAT6_PNL_ONLY_STOCK_ITEMS, isCat6Plant } from "@/lib/plant-layout";

type RouteContext = { params: Promise<{ plantId: string }> };

type ExportKind =
  | "pnl"
  | "sales"
  | "purchase"
  | "production"
  | "stock"
  | "expense"
  | "pettyCash";

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
  const cat6 = isCat6Plant(plant.code);

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
      where: {
        plantId,
        date: { gte: from, lte: to },
        ...(cat6
          ? { NOT: { sourceKey: { endsWith: "sales-online:excel" } } }
          : {}),
      },
      orderBy: cat6
        ? [{ date: "asc" }, { createdAt: "asc" }]
        : [{ date: "asc" }, { createdAt: "asc" }],
    });
    sheet.columns = cat6
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
  } else if (kind === "purchase") {
    const rows = await prisma.purchase.findMany({
      where: { plantId, date: { gte: from, lte: to } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    sheet.columns = cat6
      ? [
          { header: "S.No", key: "sno", width: 8 },
          { header: "Books", key: "books", width: 12 },
          { header: "GSTIN/GST No", key: "gstin", width: 20 },
          { header: "Vendor's Name", key: "supplier", width: 26 },
          { header: "Bill Number", key: "billNo", width: 16 },
          { header: "Bill Date", key: "billDate", width: 12 },
          { header: "Item Details", key: "description", width: 26 },
          { header: "Item QTY", key: "qty", width: 12 },
          { header: "Unit", key: "unit", width: 10 },
          { header: "Rate", key: "rate", width: 12 },
          { header: "Purchase Amt", key: "basic", width: 14 },
          { header: "Notes", key: "notes", width: 20 },
        ]
      : [
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
        books: iso(r.booksDate),
        gstin: r.gstin ?? "",
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
      where: {
        plantId,
        date: { gte: from, lte: to },
        ...(cat6 ? { itemName: { notIn: [...CAT6_PNL_ONLY_STOCK_ITEMS] } } : {}),
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    sheet.columns = cat6
      ? [
          { header: "S.No", key: "sno", width: 8 },
          { header: "Item Name", key: "item", width: 36 },
          { header: "QTY", key: "qty", width: 12 },
          { header: "UNIT", key: "unit", width: 10 },
          { header: "RATE", key: "rate", width: 12 },
          { header: "Value", key: "value", width: 14 },
        ]
      : [
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
        rate: toNum(r.rate),
        value: toNum(r.closingValue),
      });
    });
  } else if (kind === "pettyCash") {
    const rows = await prisma.pettyCashEntry.findMany({
      where: {
        plantId,
        date: { gte: from, lte: to },
        entryType: PettyCashKind.PETTY_CASH,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    sheet.columns = cat6
      ? [
          { header: "S.No", key: "sno", width: 8 },
          { header: "Date", key: "date", width: 12 },
          { header: "Output Amt", key: "amount", width: 14 },
          { header: "Nature of Expense", key: "nature", width: 28 },
          { header: "Expense Description", key: "desc", width: 44 },
          { header: "Person", key: "payMode", width: 16 },
          { header: "Location", key: "location", width: 18 },
          { header: "Check by", key: "checkedBy", width: 16 },
          { header: "Approved By", key: "approvedBy", width: 16 },
        ]
      : [
          { header: "S.No", key: "sno", width: 8 },
          { header: "Pay Mode", key: "payMode", width: 16 },
          { header: "Description of Expense", key: "desc", width: 44 },
          { header: "Bill Number", key: "billNumber", width: 22 },
          { header: "Bill Date", key: "date", width: 12 },
          { header: "Expenses", key: "amount", width: 14 },
          { header: "Contractor Salary", key: "contractorSalary", width: 18 },
          { header: "Supervisor Salary", key: "supervisorSalary", width: 18 },
          { header: "Total", key: "total", width: 14 },
        ];
    styleHeader(sheet.getRow(1));
    rows.forEach((r, i) => {
      sheet.addRow({
        sno: i + 1,
        payMode: r.payMode,
        nature: r.nature ?? "",
        desc: r.description ?? "",
        location: r.location ?? "",
        checkedBy: r.checkedBy ?? "",
        approvedBy: r.approvedBy ?? "",
        billNumber: r.billNumber ?? "",
        date: iso(r.date),
        amount: toNum(r.amount),
        contractorSalary: toNum(r.contractorSalary),
        supervisorSalary: toNum(r.supervisorSalary),
        total:
          toNum(r.amount) +
          toNum(r.contractorSalary) +
          toNum(r.supervisorSalary),
      });
    });
  } else {
    const rows = await prisma.pettyCashEntry.findMany({
      where: {
        plantId,
        date: { gte: from, lte: to },
        entryType: PettyCashKind.EXPENSE,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    sheet.columns = cat6
      ? [
          { header: "S.No", key: "sno", width: 8 },
          { header: "Months", key: "date", width: 12 },
          { header: "Category", key: "head", width: 18 },
          { header: "Remarks", key: "desc", width: 24 },
          { header: "Salary Amt", key: "amount", width: 14 },
        ]
      : [
          { header: "sNo.", key: "sno", width: 8 },
          { header: "Date", key: "date", width: 12 },
          { header: "Shift", key: "shift", width: 10 },
          { header: "Category", key: "head", width: 18 },
          { header: "Remarks / notes", key: "desc", width: 36 },
          { header: "Opening reading", key: "opening", width: 16 },
          { header: "Closing reading", key: "closing", width: 16 },
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
        opening:
          r.openingReading == null ? "" : toNum(r.openingReading),
        closing:
          r.closingReading == null ? "" : toNum(r.closingReading),
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
