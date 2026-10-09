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
    qty: unknown;
    done?: unknown;
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
    const doneNum = Number(row.done);
    map[key].parties.push({
      partyName: row.partyName,
      qty: qtyVal,
      done: Number.isFinite(doneNum) && doneNum > 0 ? doneNum : 0,
      deliveryPeriod: row.deliveryPeriod,
    });
    map[key].totalQty += qtyVal;
  }
  return map;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await ctx.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const dbOrders = await (prisma as any).plantStockOrder.findMany({
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

    if (parsed.matchedRows > 0) {
      await (prisma as any).plantStockOrder.deleteMany({
        where: { plantId },
      });
    }

    type SaveRow = {
      cable: string;
      size: string;
      partyName: string;
      qty: number;
      done: number;
      deliveryPeriod: string | null;
    };
    const byUnique = new Map<string, SaveRow>();
    for (const item of Object.values(parsed.byKey)) {
      for (const p of item.parties) {
        const partyNameClean = p.partyName.trim();
        if (!partyNameClean || partyNameClean === "—") continue;
        const doneKm = Number(p.done) > 0 ? Number(p.done) : 0;
        p.done = doneKm;
        const key = `${item.cable}\0${item.size}\0${partyNameClean.toLowerCase()}`;
        const prev = byUnique.get(key);
        if (prev) {
          prev.qty = Math.round((prev.qty + p.qty) * 10000) / 10000;
          prev.done = Math.round((prev.done + doneKm) * 10000) / 10000;
        } else {
          byUnique.set(key, {
            cable: item.cable,
            size: item.size,
            partyName: partyNameClean,
            qty: p.qty,
            done: doneKm,
            deliveryPeriod: p.deliveryPeriod,
          });
        }
      }
    }
    for (const row of byUnique.values()) {
      await (prisma as any).plantStockOrder.upsert({
        where: {
          plantId_cable_size_partyName: {
            plantId,
            cable: row.cable,
            size: row.size,
            partyName: row.partyName,
          },
        },
        create: {
          plantId,
          cable: row.cable,
          size: row.size,
          partyName: row.partyName,
          qty: row.qty,
          done: row.done,
          deliveryPeriod: row.deliveryPeriod,
        },
        update: {
          qty: row.qty,
          done: row.done,
          deliveryPeriod: row.deliveryPeriod,
        },
      });
    }

    return NextResponse.json({
      byKey: parsed.byKey,
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

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await ctx.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  await (prisma as any).plantStockOrder.deleteMany({
    where: { plantId },
  });

  return NextResponse.json({ success: true });
}


