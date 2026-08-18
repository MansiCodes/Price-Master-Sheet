import { NextRequest, NextResponse } from "next/server";
import { requirePlantAccess, requireSession } from "@/lib/api";
import { dateOnlyRegex, parseDateOnly, toIsoDateString } from "@/lib/dates";
import { prisma } from "@/lib/db";
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
      ? { plantId }
      : {
          plantId,
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

