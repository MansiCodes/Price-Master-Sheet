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
import { fileContentHash } from "@/lib/pnl/excel-import/dedupe";
import { parsePnlWorkbook } from "@/lib/pnl/excel-import/parse";
import { persistPnlImport } from "@/lib/pnl/excel-import/persist";
import { buildPnlImportTemplate } from "@/lib/pnl/excel-import/template";

type RouteContext = { params: Promise<{ plantId: string }> };

/** Download blank multi-sheet import template (columns match this plant's forms). */
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

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

  const salesPurchaseOnly = isAccountantPnlLimited(session.user.globalRole);
  const buf = await buildPnlImportTemplate({
    plantCode: plant.code,
    plantName: plant.name,
    salesPurchaseOnly,
  });
  const safeCode = plant.code.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeCode}-pnl-import-template.xlsx"`,
      "Cache-Control": "no-store",
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
  const fileHash = fileContentHash(buffer);

  // Exact same file already imported for this plant
  const priorFile = await prisma.auditLog.findFirst({
    where: {
      plantId,
      field: "excel-import",
      newValue: { contains: `"fileHash":"${fileHash}"` },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, newValue: true },
  });
  if (priorFile) {
    return NextResponse.json(
      {
        error: "This file was already uploaded for this plant.",
        alreadyUploaded: true,
        uploadedAt: priorFile.createdAt.toISOString(),
      },
      { status: 409 },
    );
  }

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
    const skipHint =
      parsed.skipped.length > 0
        ? ` Details: ${parsed.skipped
            .slice(0, 3)
            .map((s) => `${s.sheet}${s.row ? ` row ${s.row}` : ""} — ${s.reason}`)
            .join("; ")}`
        : "";
    const sheets =
      parsed.sheetsFound.length > 0
        ? ` Sheets in file: ${parsed.sheetsFound.join(", ")}.`
        : "";
    return NextResponse.json(
      {
        error: salesPurchaseOnly
          ? `No Sales or Purchase rows found.${sheets}${skipHint}`
          : `No importable rows found. The file can be any Excel with recognizable columns (Customer/Item/Quantity for sales, etc.) — template is optional.${sheets}${skipHint}`,
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

  if (summary.alreadyUploaded) {
    return NextResponse.json(
      {
        error:
          "All rows in this file were already uploaded (duplicates skipped).",
        alreadyUploaded: true,
        summary,
      },
      { status: 409 },
    );
  }

  await writeAuditLog({
    entityType: "Plant",
    entityId: plantId,
    field: "excel-import",
    newValue: {
      fileName: file.name,
      fileHash,
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
        duplicates: summary.duplicates,
      },
    },
    actorId: session.user.id,
    plantId,
    isBackdated: false,
  });

  return NextResponse.json({ ok: true, summary });
}
