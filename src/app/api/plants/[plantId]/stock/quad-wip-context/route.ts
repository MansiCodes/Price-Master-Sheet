import { NextRequest, NextResponse } from "next/server";
import {
  requirePlantAccess,
  requireSession,
} from "@/lib/api";
import { dateOnlyRegex, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
} from "@/lib/plant-catalogs";
import {
  callPutupItemsFromCableMeta,
  frozenCallPutupKm,
  mergeNoteCallPutups,
  type NoteCallPutup,
} from "@/components/today/hub/process-row-out-label";
import { isQuadSignalPlant } from "@/lib/plant-layout";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import { isFormOuterProcess } from "@/lib/quad-signal-form-stock";
import { resolveQuadSignalStockOpening } from "@/lib/quad-signal-opening";
import { canAlwaysEditQuadOpeningStock } from "@/lib/rbac";
import {
  resolveQuadSignalVariant,
  saleMatchesCableSize,
  sumSalesKmForSize,
} from "@/lib/quad-signal-wip";

type RouteContext = { params: Promise<{ plantId: string }> };

function callPutupsFromNotes(notes: string | null | undefined): NoteCallPutup[] {
  const { meta } = parseQuadSignalStockNotes(notes);
  return meta?.kind === "cable" ? callPutupItemsFromCableMeta(meta) : [];
}

function outerQty(map: Record<string, number> | undefined): number | null {
  const hit = Object.entries(map ?? {}).find(([key]) => isFormOuterProcess(key));
  const n = hit ? Number(hit[1]) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Saved Outer closing is below opening + production, i.e. that save subtracted put-up. */
function outerClosingTookPutup(meta: {
  opening?: Record<string, number>;
  production?: Record<string, number>;
  closing?: Record<string, number>;
}): boolean {
  const closing = outerQty(meta.closing);
  if (closing == null) return true;
  const gross = (outerQty(meta.opening) ?? 0) + (outerQty(meta.production) ?? 0);
  return gross - closing > 0.0005;
}

function stripInsulationQty(map: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(map)) {
    if (key.trim().toLowerCase() === "insulation") continue;
    out[key] = raw;
  }
  return out;
}

/**
 * Opening WIP + Sales-ledger qty for Quad/Signal stock form.
 * Opening is editable on first entry per cable+size, or anytime for Tarun.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { code: true },
  });
  if (!plant || !isQuadSignalPlant(plant.code)) {
    return NextResponse.json(
      { error: "Quad / Signal plant only" },
      { status: 400 },
    );
  }

  const dateRaw = (request.nextUrl.searchParams.get("date") ?? "").trim();
  const cable = (request.nextUrl.searchParams.get("cable") ?? "").trim();
  const size = (request.nextUrl.searchParams.get("size") ?? "").trim();
  const shiftRaw = (request.nextUrl.searchParams.get("shift") ?? "DAY")
    .trim()
    .toUpperCase();
  void shiftRaw;

  if (!dateOnlyRegex.test(dateRaw)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!cable || !size) {
    return NextResponse.json(
      { error: "cable and size are required" },
      { status: 400 },
    );
  }

  const day = parseDateOnly(dateRaw);
  const plantIds = await resolveReportPlantIds(plantId);
  const pScope = plantIdFilter(plantIds);
  const itemName = `${cable} · ${size}`;
  const processes = [...getQuadSignalCableProcesses(cable)];
  const variant = resolveQuadSignalVariant(size);
  const alwaysEditable = canAlwaysEditQuadOpeningStock(session.user.email);

  const {
    opening,
    openingFromDate,
    openingEditable,
    production,
    productionHints,
    insulationContributions,
    putupKm,
  } = await resolveQuadSignalStockOpening({
    plantIds,
    day,
    cable,
    size,
    alwaysEditable,
  });

  const sales = await prisma.sale.findMany({
    where: {
      ...pScope,
      date: day,
    },
    select: {
      id: true,
      billNumber: true,
      customerName: true,
      itemDescription: true,
      quantity: true,
      unit: true,
    },
  });

  const matchedSales = sales.filter((s) =>
    saleMatchesCableSize(s.itemDescription, cable, size),
  );
  const salesKm = sumSalesKmForSize(
    matchedSales.map((s) => ({
      itemDescription: s.itemDescription,
      quantity: Number(s.quantity),
    })),
    cable,
    size,
  );

  const todayStocks = await prisma.stockEntry.findMany({
    where: {
      ...pScope,
      date: day,
      itemName,
    },
    orderBy: { updatedAt: "desc" },
    select: { notes: true },
  });
  const existingStock = todayStocks[0] ?? null;
  const latestStock = existingStock
    ? existingStock
    : await prisma.stockEntry.findFirst({
        where: {
          ...pScope,
          itemName,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: { notes: true },
      });
  const { meta: existingMeta } = parseQuadSignalStockNotes(
    latestStock?.notes,
  );
  const putupsAlreadyClosed = Boolean(
    existingMeta?.kind === "cable" && existingMeta.outerClosingIncludesPutup,
  );
  const latestPutups = callPutupsFromNotes(latestStock?.notes);

  let callPutupItems: NoteCallPutup[] = [];
  let callPutupCarriedItems: NoteCallPutup[] = [];
  const carriedCount =
    existingMeta?.kind === "cable"
      ? Math.max(0, Math.floor(Number(existingMeta.callPutupCarriedCount) || 0))
      : 0;
  if (existingStock && carriedCount > 0) {
    callPutupCarriedItems = latestPutups.slice(0, carriedCount);
    callPutupItems = latestPutups.slice(carriedCount);
  } else if (existingStock) {
    const todayItems = mergeNoteCallPutups(
      todayStocks.flatMap((row) => callPutupsFromNotes(row.notes)),
    );
    callPutupItems = todayItems.length > 0 ? todayItems : latestPutups;
    if (
      callPutupItems.length > 0 &&
      putupsAlreadyClosed &&
      existingMeta?.kind === "cable" &&
      !outerClosingTookPutup(existingMeta)
    ) {
      callPutupCarriedItems = callPutupItems;
      callPutupItems = [];
    }
    if (callPutupItems.length === 0) {
      const prevStock = await prisma.stockEntry.findFirst({
        where: { ...pScope, itemName, date: { lt: day } },
        orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
        select: { notes: true },
      });
      const { meta: prevMeta } = parseQuadSignalStockNotes(prevStock?.notes);
      const prevPutups = callPutupsFromNotes(prevStock?.notes);
      if (prevMeta?.kind === "cable" && prevMeta.outerClosingIncludesPutup) {
        callPutupCarriedItems = prevPutups;
      } else {
        callPutupItems = prevPutups;
      }
    }
  } else if (putupsAlreadyClosed) {
    callPutupCarriedItems = latestPutups;
  } else {
    callPutupItems = latestPutups;
  }
  const loadPutups = callPutupItems.length > 0;
  const callPutupOriginalKm = loadPutups
    ? frozenCallPutupKm(
        existingMeta?.kind === "cable" ? existingMeta.callPutupOriginalKm : 0,
        callPutupItems,
      )
    : 0;

  const stockMeta =
    existingMeta?.kind === "cable"
      ? {
          callPutup: loadPutups
            ? callPutupItems[0]?.qty != null
              ? String(callPutupItems[0].qty)
              : existingMeta.callPutup ?? ""
            : "",
          putupDate: loadPutups
            ? callPutupItems[0]?.date ?? existingMeta.putupDate ?? ""
            : "",
          partyName: loadPutups
            ? callPutupItems[0]?.partyName ?? existingMeta.partyName ?? ""
            : "",
          dispatchPending:
            existingMeta.dispatchPending != null
              ? String(existingMeta.dispatchPending)
              : "",
          dispatchParty: existingMeta.dispatchParty ?? "",
          callPutupItems,
          callPutupCarriedItems,
          callPutupOriginalKm,
          dispatchPendingItems: existingMeta.dispatchPendingItems ?? [],
          dispatchSettledKm: existingMeta.dispatchSettledKm ?? 0,
          dispatchSettledItems: existingMeta.dispatchSettledItems ?? [],
          outerClosingIncludesPutup: Boolean(existingMeta.outerClosingIncludesPutup),
          saleItems: existingMeta.saleItems ?? [],
          opening: stripInsulationQty(existingMeta.opening ?? {}),
          production: stripInsulationQty(existingMeta.production ?? {}),
          powerLayingFactor: existingMeta.powerLayingFactor,
        }
      : null;

  return NextResponse.json({
    date: dateRaw,
    cable,
    size,
    itemName,
    processes,
    opening,
    openingFromDate,
    openingEditable,
    openingAlwaysEditable: alwaysEditable,
    production,
    productionHints,
    insulationContributions,
    putupKm,
    salesKm,
    sales: matchedSales.map((s) => ({
      id: s.id,
      billNumber: s.billNumber,
      customerName: s.customerName,
      itemDescription: s.itemDescription,
      quantity: Number(s.quantity),
      unit: s.unit,
    })),
    variant,
    stockMeta,
    sameDay: Boolean(existingStock),
  });
}
