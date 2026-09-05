import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { auth } from "@/auth";
import { startOfUtcDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/format/inr";
import { canAccessPlant, isAdminOrHead } from "@/lib/rbac";

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return startOfUtcDay(d);
}

function toNum(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminOrHead(session.user.globalRole)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const plantId = url.searchParams.get("plantId");
  const from = parseDateParam(url.searchParams.get("from"));
  const to = parseDateParam(url.searchParams.get("to"));
  const format = (url.searchParams.get("format") ?? "xlsx").toLowerCase();

  if (!plantId || !from || !to) {
    return NextResponse.json(
      { ok: false, message: "plantId, from, and to are required" },
      { status: 400 },
    );
  }
  if (from.getTime() > to.getTime()) {
    return NextResponse.json(
      { ok: false, message: "from must be on or before to" },
      { status: 400 },
    );
  }
  if (!(await canAccessPlant(session.user.id, plantId))) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true, name: true, code: true },
  });
  if (!plant) {
    return NextResponse.json({ ok: false, message: "Plant not found" }, { status: 404 });
  }

  const [purchases, sales, purchaseAgg, salesAgg] = await Promise.all([
    prisma.purchase.findMany({
      where: { plantId, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    }),
    prisma.sale.findMany({
      where: { plantId, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    }),
    prisma.purchase.aggregate({
      where: { plantId, date: { gte: from, lte: to } },
      _sum: { invoiceValue: true, basicValue: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { plantId, date: { gte: from, lte: to } },
      _sum: { salesValue: true },
      _count: true,
    }),
  ]);

  const summary = {
    plant,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    purchaseCount: purchaseAgg._count,
    purchaseBasicTotal: toNum(purchaseAgg._sum.basicValue),
    purchaseInvoiceTotal: toNum(purchaseAgg._sum.invoiceValue),
    saleCount: salesAgg._count,
    salesTotal: toNum(salesAgg._sum.salesValue),
  };

  if (format === "json") {
    return NextResponse.json({
      ok: true,
      summary,
      purchases,
      sales,
    });
  }

  if (format === "pdf") {
    try {
      const doc = new jsPDF();
      const lines = [
        `Export — ${plant.name} (${plant.code})`,
        `Period: ${summary.from} to ${summary.to}`,
        "",
        `Purchases: ${summary.purchaseCount} rows`,
        `Purchase basic total: ${formatINR(summary.purchaseBasicTotal)}`,
        `Purchase invoice total: ${formatINR(summary.purchaseInvoiceTotal)}`,
        "",
        `Sales: ${summary.saleCount} rows`,
        `Sales total: ${formatINR(summary.salesTotal)}`,
      ];
      let y = 20;
      for (const line of lines) {
        doc.text(line, 14, y);
        y += 8;
      }
      const buf = Buffer.from(doc.output("arraybuffer"));
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="export-${plant.code}-${summary.from}-${summary.to}.pdf"`,
        },
      });
    } catch {
      return NextResponse.json({
        ok: true,
        stub: true,
        message: "PDF generation unavailable; returning JSON summary",
        summary,
      });
    }
  }

  // default xlsx
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Price Sheet";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.addRows([
    ["Plant", plant.name],
    ["Code", plant.code],
    ["From", summary.from],
    ["To", summary.to],
    [],
    ["Purchase count", summary.purchaseCount],
    ["Purchase basic total", summary.purchaseBasicTotal],
    ["Purchase invoice total", summary.purchaseInvoiceTotal],
    ["Sale count", summary.saleCount],
    ["Sales total", summary.salesTotal],
  ]);

  const purchaseSheet = workbook.addWorksheet("Purchases");
  purchaseSheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Type", key: "type", width: 14 },
    { header: "Vendor", key: "vendor", width: 24 },
    { header: "Item", key: "item", width: 28 },
    { header: "Qty", key: "qty", width: 10 },
    { header: "Rate", key: "rate", width: 12 },
    { header: "Basic", key: "basic", width: 14 },
    { header: "Invoice", key: "invoice", width: 14 },
  ];
  for (const p of purchases) {
    purchaseSheet.addRow({
      date: p.date.toISOString().slice(0, 10),
      type: p.type,
      vendor: p.vendorName,
      item: p.itemDescription,
      qty: toNum(p.quantity),
      rate: toNum(p.rate),
      basic: toNum(p.basicValue),
      invoice: toNum(p.invoiceValue),
    });
  }

  const salesSheet = workbook.addWorksheet("Sales");
  salesSheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Type", key: "type", width: 14 },
    { header: "Customer", key: "customer", width: 24 },
    { header: "Item", key: "item", width: 28 },
    { header: "Qty", key: "qty", width: 10 },
    { header: "Rate", key: "rate", width: 12 },
    { header: "Sales value", key: "sales", width: 14 },
  ];
  for (const s of sales) {
    salesSheet.addRow({
      date: s.date.toISOString().slice(0, 10),
      type: s.type,
      customer: s.customerName,
      item: s.itemDescription,
      qty: toNum(s.quantity),
      rate: toNum(s.rate),
      sales: toNum(s.salesValue),
    });
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="export-${plant.code}-${summary.from}-${summary.to}.xlsx"`,
    },
  });
}
