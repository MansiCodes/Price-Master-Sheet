import { NextRequest, NextResponse } from "next/server";
import { requirePlantAccess, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";

type RouteContext = { params: Promise<{ plantId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const plantIds = await resolveReportPlantIds(plantId);
  const pScope = plantIdFilter(plantIds);

  const sp = request.nextUrl.searchParams;
  const page = Number(sp.get("page")) || 1;
  const pageSize = Number(sp.get("pageSize")) || 10;

  const total = await prisma.fixedAsset.count({ where: { ...pScope } });
  const skip = (Math.max(1, page) - 1) * Math.max(1, pageSize);
  const take = Math.max(1, pageSize);

  const rows = await prisma.fixedAsset.findMany({
    where: { ...pScope },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  const totalPages = Math.max(1, Math.ceil(total / take));
  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      assetDescription: r.assetDescription,
      vendor: r.vendor,
      billNumber: r.billNumber,
      billDate: r.billDate ? r.billDate.toISOString().slice(0, 10) : null,
      cost: Number(r.cost),
      depreciationPercent: Number(r.depreciationPercent),
    })),
    page: Math.min(Math.max(1, page), totalPages),
    pageSize: take,
    total,
    totalPages,
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const id = sp.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.fixedAsset.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  let body: {
    id?: string;
    description?: string;
    amount?: number | string;
    date?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.description !== undefined) {
    data.assetDescription = body.description.trim();
  }
  if (body.amount !== undefined) {
    data.cost = Number(body.amount);
  }
  if (body.date) {
    data.billDate = new Date(`${body.date}T00:00:00.000Z`);
  }

  await prisma.fixedAsset.update({
    where: { id: body.id },
    data,
  });

  return NextResponse.json({ ok: true });
}

