import { NextRequest, NextResponse } from "next/server";
import { StockCategory } from "@prisma/client";
import { requirePlantAccess, requireSession } from "@/lib/api";
import { resolveEntryApprovalFlags } from "@/lib/entry-approval";
import { todayDateString } from "@/lib/dates";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { prisma } from "@/lib/db";
import { CAT6_PNL_ONLY_STOCK_ITEMS, isCat6Plant, isQuadSignalPlant } from "@/lib/plant-layout";
import {
  atclStockEntryFilter,
  closingStockEntryFilter,
} from "@/lib/plant-catalogs";
import { seesOwnEntriesOnly } from "@/lib/rbac";
import { paginate } from "@/lib/ui/paginate";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import { dedupeTodayQuadCableRows } from "./stock-amounts";
import type { RouteContext } from "./stock-schemas";

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

  const sp = request.nextUrl.searchParams;
  const { filter, error } = dateRangeFromSearchParams(sp);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  const page = Number(sp.get("page")) || 1;
  const pageSize = Number(sp.get("pageSize")) || 10;

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { code: true },
  });
  const cat6 = isCat6Plant(plant?.code);
  const quadSignal = isQuadSignalPlant(plant?.code);
  const snapshot = sp.get("snapshot") === "1";
  const atcl = sp.get("atcl") === "1";
  const kindParam = (sp.get("kind") ?? "").trim().toLowerCase();
  const ownOnly = seesOwnEntriesOnly(session.user.globalRole);

  const categoryFilter =
    kindParam === "raw"
      ? { category: StockCategory.RM }
      : kindParam === "cable"
        ? { category: StockCategory.FG }
        : {};

  const entriesRaw = await prisma.stockEntry.findMany({
    where: {
      ...pScope,
      ...(ownOnly ? { enteredById: session.user.id } : {}),
      ...filter,
      ...categoryFilter,
      ...(cat6 ? { itemName: { notIn: [...CAT6_PNL_ONLY_STOCK_ITEMS] } } : {}),
      ...(snapshot ? closingStockEntryFilter() : {}),
      ...(atcl ? atclStockEntryFilter() : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { enteredBy: { select: { globalRole: true } } },
  });

  const entries =
    quadSignal && (kindParam === "cable" || kindParam === "")
      ? dedupeTodayQuadCableRows(entriesRaw, todayDateString())
      : entriesRaw;

  const { slice, ...pageInfo } = paginate(entries, page, pageSize);
  const totals = entries.reduce(
    (acc, row) => {
      acc.quantity += Number(row.quantity) || 0;
      acc.closingValue += Number(row.closingValue) || 0;
      return acc;
    },
    { quantity: 0, closingValue: 0 },
  );

  const rowsWithStatus = slice.map((e) => ({
    ...e,
    ...resolveEntryApprovalFlags(e, e.enteredBy?.globalRole ?? null),
  }));

  return NextResponse.json({ rows: rowsWithStatus, ...pageInfo, totals });
}
