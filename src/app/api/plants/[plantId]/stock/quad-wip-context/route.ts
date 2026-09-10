import { NextRequest, NextResponse } from "next/server";
import {
  requirePlantAccess,
  requireSession,
} from "@/lib/api";
import { dateOnlyRegex, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getQuadSignalCableProcesses } from "@/lib/plant-catalogs";
import { isQuadSignalPlant } from "@/lib/plant-layout";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import { resolveQuadSignalStockOpening } from "@/lib/quad-signal-opening";
import {
  resolveQuadSignalVariant,
  saleMatchesCableSize,
  sumSalesKmForSize,
} from "@/lib/quad-signal-wip";

type RouteContext = { params: Promise<{ plantId: string }> };

/**
 * Opening WIP + Sales-ledger qty for Quad/Signal stock form.
 * Sales form is unchanged — this only reads Sale rows.
 * Opening is editable only for the first entry of each cable+size.
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

  const {
    opening,
    openingFromDate,
    openingEditable,
  } = await resolveQuadSignalStockOpening({
    plantIds,
    day,
    cable,
    size,
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

  return NextResponse.json({
    date: dateRaw,
    cable,
    size,
    itemName,
    processes,
    opening,
    openingFromDate,
    openingEditable,
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
