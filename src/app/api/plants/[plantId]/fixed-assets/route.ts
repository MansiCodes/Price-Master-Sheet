import { NextRequest, NextResponse } from "next/server";
import { requirePlantAccess, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ plantId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const page = Number(sp.get("page")) || 1;
  const pageSize = Number(sp.get("pageSize")) || 10;

  const total = await prisma.fixedAsset.count({ where: { plantId } });
  const skip = (Math.max(1, page) - 1) * Math.max(1, pageSize);
  const take = Math.max(1, pageSize);

  const rows = await prisma.fixedAsset.findMany({
    where: { plantId },
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

