import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requirePlantAccess, requireSession } from "@/lib/api";
import {
  dateOnlyRegex,
  parseDateOnly,
  todayDateString,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import { canViewPnl, isAccountantPnlLimited, seesOwnEntriesOnly } from "@/lib/rbac";
import { isCat6Plant } from "@/lib/plant-layout";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import {
  plantFilenameStem,
  type ExportKind,
  type RouteContext,
} from "./export-utils";
import { fillPnlSheet } from "./fill-pnl";
import { fillSalesSheet } from "./fill-sales";
import { fillPurchaseSheet } from "./fill-purchase";
import { fillProductionSheet } from "./fill-production";
import { fillStockSheet } from "./fill-stock";
import { fillRentSheet } from "./fill-rent";
import { fillFixedAssetsSheet } from "./fill-fixed-assets";
import { fillExpenseSheet, fillPettyCashSheet } from "./fill-petty-cash";

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const plantIds = await resolveReportPlantIds(plantId);
  const pScope = plantIdFilter(plantIds);

  const kind = (request.nextUrl.searchParams.get("kind") ??
    "pnl") as ExportKind;
  const fromRaw = (request.nextUrl.searchParams.get("from") ?? "").trim();
  const toRaw = (request.nextUrl.searchParams.get("to") ?? "").trim();

  if (
    (fromRaw && !dateOnlyRegex.test(fromRaw)) ||
    (toRaw && !dateOnlyRegex.test(toRaw))
  ) {
    return NextResponse.json({ error: "Invalid from/to date" }, { status: 400 });
  }

  if (!canViewPnl(session.user.globalRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (
    isAccountantPnlLimited(session.user.globalRole) &&
    kind !== "sales" &&
    kind !== "purchase"
  ) {
    return NextResponse.json(
      { error: "Accountants can only export Sales and Purchase" },
      { status: 403 },
    );
  }

  const from = fromRaw ? parseDateOnly(fromRaw) : null;
  const to = toRaw ? parseDateOnly(toRaw) : null;

  /** Match list APIs: empty range = all rows; one-sided = open bound. */
  const dateFilter: { date?: { gte?: Date; lte?: Date } } = (() => {
    if (!from && !to) return {};
    if (from && !to) return { date: { gte: from } };
    if (!from && to) return { date: { lte: to } };
    if (from!.getTime() > to!.getTime()) {
      return { date: { gte: to!, lte: from! } };
    }
    return { date: { gte: from!, lte: to! } };
  })();

  const pnlFrom = from ?? parseDateOnly("2025-01-01");
  const pnlTo = to ?? parseDateOnly(todayDateString());
  const fromStr = fromRaw || "all";
  const toStr = toRaw || "all";

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true, name: true, code: true },
  });
  if (!plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }
  const cat6 = isCat6Plant(plant.code);
  const ownOnly = seesOwnEntriesOnly(session.user.globalRole);
  const byUser = ownOnly ? { enteredById: session.user.id } : {};

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Atlanta Telecables";
  const sheetName =
    kind === "factoryRent"
      ? "Factory Rent"
      : kind === "electricityRent"
        ? "Electricity"
        : kind.toUpperCase();
  const sheet = workbook.addWorksheet(sheetName);

  const listOpts = { pScope, byUser, dateFilter, cat6 };

  if (kind === "pnl") {
    const forbidden = await fillPnlSheet(sheet, {
      plantId,
      pnlFrom,
      pnlTo,
      globalRole: session.user.globalRole,
      userId: session.user.id,
    });
    if (forbidden) return forbidden;
  } else if (kind === "sales") {
    await fillSalesSheet(sheet, listOpts);
  } else if (kind === "purchase") {
    await fillPurchaseSheet(sheet, listOpts);
  } else if (kind === "production") {
    await fillProductionSheet(sheet, listOpts);
  } else if (kind === "stock") {
    await fillStockSheet(sheet, { pScope, byUser, dateFilter, plantCode: plant.code });
  } else if (kind === "electricityRent" || kind === "factoryRent") {
    await fillRentSheet(sheet, {
      kind,
      pScope,
      plantCode: plant.code,
      from,
      to,
    });
  } else if (kind === "fixedAssets") {
    await fillFixedAssetsSheet(sheet, { pScope, pnlFrom, pnlTo });
  } else if (kind === "pettyCash") {
    await fillPettyCashSheet(sheet, listOpts);
  } else {
    await fillExpenseSheet(sheet, listOpts);
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const filename = `${plantFilenameStem(plant.code, plant.name)}-${kind}-${fromStr}-to-${toStr}.xlsx`;

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
