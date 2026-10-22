import { NextRequest, NextResponse } from "next/server";
import { requirePlantAccess, requireSession } from "@/lib/api";
import { dateOnlyRegex, parseDateOnly, toIsoDateString } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import { paginate } from "@/lib/ui/paginate";

type RouteContext = { params: Promise<{ plantId: string }> };

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

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

  const fromStr =
    sp.get("from") ?? sp.get("date") ?? undefined;
  const toStr = sp.get("to") ?? fromStr;

  // UI always passes from/to, but keep safe defaults.
  const safeFrom = fromStr ?? sp.get("date") ?? "2000-01-01";
  const safeTo = toStr ?? safeFrom;

  if (!dateOnlyRegex.test(safeFrom) || !dateOnlyRegex.test(safeTo)) {
    return NextResponse.json(
      { error: "Invalid from/to date" },
      { status: 400 },
    );
  }

  const fromDate = parseDateOnly(safeFrom);
  const toDate = parseDateOnly(safeTo);
  if (fromDate.getTime() > toDate.getTime()) {
    return NextResponse.json(
      { error: "from must be on or before to" },
      { status: 400 },
    );
  }

  const register = sp.get("register") === "1";
  const fromMonth = startOfUtcMonth(fromDate);
  const toMonth = startOfUtcMonth(toDate);
  const entries = await prisma.electricityRent.findMany({
    where: register
      ? { ...pScope }
      : {
          ...pScope,
          month: { gte: fromMonth, lte: toMonth },
        },
    orderBy: { month: "asc" },
  });

  const { slice, ...pageInfo } = paginate(entries, page, pageSize);
  return NextResponse.json({
    rows: slice.map((row) => ({
      ...row,
      month: toIsoDateString(row.month),
    })),
    ...pageInfo,
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
  const field = sp.get("field"); // "rent" or "bill"

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.electricityRent.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (field === "rent") {
    if (!existing.billAmount || Number(existing.billAmount) === 0) {
      await prisma.electricityRent.delete({ where: { id } });
    } else {
      await prisma.electricityRent.update({
        where: { id },
        data: { rentAmount: 0 },
      });
    }
  } else if (field === "bill") {
    if (!existing.rentAmount || Number(existing.rentAmount) === 0) {
      await prisma.electricityRent.delete({ where: { id } });
    } else {
      await prisma.electricityRent.update({
        where: { id },
        data: { billAmount: 0 },
      });
    }
  } else {
    await prisma.electricityRent.delete({ where: { id } });
  }

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
    field?: "rent" | "bill";
    amount?: number | string;
    description?: string;
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
  if (body.field === "rent" && body.amount !== undefined) {
    data.rentAmount = Number(body.amount);
  } else if (body.field === "bill" && body.amount !== undefined) {
    data.billAmount = Number(body.amount);
  }
  if (body.description !== undefined) {
    data.notes = body.description;
  }

  await prisma.electricityRent.update({
    where: { id: body.id },
    data,
  });

  return NextResponse.json({ ok: true });
}

