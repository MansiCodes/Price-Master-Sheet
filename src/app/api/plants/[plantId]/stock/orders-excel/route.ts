import { NextRequest, NextResponse } from "next/server";
import {
  requirePlantAccess,
  requireSession,
} from "@/lib/api";
import { isQuadSignalPlant } from "@/lib/plant-layout";
import { prisma } from "@/lib/db";
import { parseStockOrdersExcel } from "@/lib/stock/order-excel";

type RouteContext = { params: Promise<{ plantId: string }> };

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
