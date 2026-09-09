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
  quadSignalClosingFromMeta,
} from "@/lib/plant-catalogs";
import { isQuadSignalPlant } from "@/lib/plant-layout";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import {
  resolveQuadSignalVariant,
  saleMatchesCableSize,
  sumSalesKmForSize,
} from "@/lib/quad-signal-wip";

type RouteContext = { params: Promise<{ plantId: string }> };

/**
 * Opening WIP + Sales-ledger qty for Quad/Signal stock form.
 * Sales form is unchanged — this only reads Sale rows.
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

  // Prior cable stock entry (same item or matching meta) → opening = its closing
  const priorRows = await prisma.stockEntry.findMany({
    where: {
      ...pScope,
      date: { lt: day },
      category: "FG",
      OR: [
        { itemName },
        { notes: { startsWith: "QSSTOCK:" } },
      ],
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: { id: true, date: true, itemName: true, notes: true },
  });

  let opening: Record<string, number> = {};
  let openingFromDate: string | null = null;
  for (const row of priorRows) {
    const { meta } = parseQuadSignalStockNotes(row.notes);
    const sameItem =
      row.itemName === itemName ||
      (meta?.kind === "cable" &&
        meta.cable === cable &&
        meta.size === size);
    if (!sameItem) continue;
    opening = quadSignalClosingFromMeta(meta);
    openingFromDate = row.date.toISOString().slice(0, 10);
    break;
  }

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

  return NextResponse.json({
    date: dateRaw,
    cable,
    size,
    processes,
    opening,
    openingFromDate,
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
  });
}
