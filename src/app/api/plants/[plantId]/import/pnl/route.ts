import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import {
  requireCanEnter,
  requirePlantAccess,
  requireSession,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isAccountantPnlLimited } from "@/lib/rbac";
import { parsePnlWorkbook } from "@/lib/pnl/excel-import/parse";
import { persistPnlImport } from "@/lib/pnl/excel-import/persist";
import { buildPnlImportTemplate } from "@/lib/pnl/excel-import/template";

type RouteContext = { params: Promise<{ plantId: string }> };

/** Download blank multi-sheet import template. */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const buf = await buildPnlImportTemplate();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="pnl-import-template.xlsx"',
    },
  });
}

/** Upload a multi-sheet Excel and fill Sales / Purchase / Stock / Expense tables. */
export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnter(session.user.globalRole);
  if (enterDenied) return enterDenied;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true, code: true, name: true },
  });
  if (!plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xlsm")) {
    return NextResponse.json(
      { error: "Upload an .xlsx Excel file" },
      { status: 400 },
    );
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 15 MB)" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed = await parsePnlWorkbook(buffer, { plantCode: plant.code });

  // Accountants may only import Sales + Purchase sheets.
  const salesPurchaseOnly = isAccountantPnlLimited(session.user.globalRole);
  if (salesPurchaseOnly) {
    const dropped =
      parsed.stock.length + parsed.expenses.length;
    parsed = {
      ...parsed,
      stock: [],
      expenses: [],
      skipped: [
        ...parsed.skipped,
        ...(dropped > 0
          ? [
              {
                sheet: "Stock/Expense",
                row: 0,
                reason:
                  "Skipped — accountants can only import Sales and Purchase",
              },
            ]
          : []),
      ],
    };
  }

  const totalRows =
    parsed.sales.length +
    parsed.purchases.length +
    parsed.stock.length +
    parsed.expenses.length;

  if (totalRows === 0) {
    return NextResponse.json(
      {
        error: salesPurchaseOnly
          ? "No Sales or Purchase rows found. Use sheets named Sales and/or Purchase with a header row."
          : "No importable rows found. Use sheets named Sales, Purchase, Stock, Expense with a header row.",
        sheetsFound: parsed.sheetsFound,
        skipped: parsed.skipped,
      },
      { status: 400 },
    );
  }

  const batchId = randomBytes(6).toString("hex");
  const uploadedAt = new Date();

  const summary = await persistPnlImport({
    prisma,
    plantId,
    enteredById: session.user.id,
    role: session.user.globalRole,
    parsed,
    batchId,
    uploadedAt,
  });

  await writeAuditLog({
    entityType: "Plant",
    entityId: plantId,
    field: "excel-import",
    newValue: {
      fileName: file.name,
      batchId,
      uploadedAt: uploadedAt.toISOString(),
      counts: {
        sales: summary.sales,
        purchases: summary.purchases,
        stock: summary.stock,
        expenses: summary.expenses,
        electricity: summary.electricity,
        rent: summary.rent,
        far: summary.far,
      },
    },
    actorId: session.user.id,
    plantId,
    isBackdated: false,
  });

  return NextResponse.json({ ok: true, summary });
}
