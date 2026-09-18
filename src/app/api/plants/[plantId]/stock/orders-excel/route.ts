import { NextRequest, NextResponse } from "next/server";
import {
  requirePlantAccess,
  requireSession,
} from "@/lib/api";
import { isQuadSignalPlant } from "@/lib/plant-layout";
import { prisma } from "@/lib/db";
import { parseStockOrdersExcel } from "@/lib/stock/order-excel";
import type { StockOrderBySize } from "@/lib/stock/order-excel-types";

type RouteContext = { params: Promise<{ plantId: string }> };

function buildOrdersByKeyMap(
  dbOrders: Array<{
    cable: string;
    size: string;
    partyName: string;
    qty: any;
    deliveryPeriod: string | null;
  }>,
): Record<string, StockOrderBySize> {
  const map: Record<string, StockOrderBySize> = {};
  for (const row of dbOrders) {
    const key = `${row.cable} · ${row.size}`;
    if (!map[key]) {
      map[key] = {
        cable: row.cable,
        size: row.size,
        totalQty: 0,
        parties: [],
      };
    }
    const qtyNum = Number(row.qty);
    const qtyVal = Number.isFinite(qtyNum) ? qtyNum : 0;
    map[key].parties.push({
      partyName: row.partyName,
      qty: qtyVal,
      deliveryPeriod: row.deliveryPeriod,
    });
    map[key].totalQty += qtyVal;
  }
  return map;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await ctx.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const dbOrders = await prisma.plantStockOrder.findMany({
    where: { plantId },
    orderBy: { createdAt: "asc" },
  });

  const byKey = buildOrdersByKeyMap(dbOrders);
  return NextResponse.json({ byKey });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await ctx.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { code: true },
  });
  if (!plant || !isQuadSignalPlant(plant.code)) {
    return NextResponse.json(
      { error: "Orders Excel upload is only for Quad + Signal plants." },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Excel file is required." }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return NextResponse.json(
      { error: "Upload an .xlsx Excel file." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const parsed = await parseStockOrdersExcel(buffer);

    for (const item of Object.values(parsed.byKey)) {
      for (const p of item.parties) {
        const partyNameClean = p.partyName.trim();
        if (!partyNameClean) continue;
        await prisma.plantStockOrder.upsert({
          where: {
            plantId_cable_size_partyName: {
              plantId,
              cable: item.cable,
              size: item.size,
              partyName: partyNameClean,
            },
          },
          create: {
            plantId,
            cable: item.cable,
            size: item.size,
            partyName: partyNameClean,
            qty: p.qty,
            deliveryPeriod: p.deliveryPeriod,
          },
          update: {
            qty: p.qty,
            deliveryPeriod: p.deliveryPeriod,
          },
        });
      }
    }

    const dbOrders = await prisma.plantStockOrder.findMany({
      where: { plantId },
      orderBy: { createdAt: "asc" },
    });
    const mergedByKey = buildOrdersByKeyMap(dbOrders);

    return NextResponse.json({
      byKey: mergedByKey,
      matchedRows: parsed.matchedRows,
      unmatchedSizes: parsed.unmatchedSizes,
      skippedRows: parsed.skippedRows,
      fileName: file.name,
    });
  } catch (err) {
    console.error("[stock-orders-excel]", err);
    return NextResponse.json(
      { error: "Could not read that Excel file." },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await ctx.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  await prisma.plantStockOrder.deleteMany({
    where: { plantId },
  });

  return NextResponse.json({ success: true });
}

