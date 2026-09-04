import { NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  requirePlantAccess,
  requireSession,
} from "@/lib/api";
import {
  dateOnlyRegex,
  parseDateOnly,
  todayDateString,
} from "@/lib/dates";
import { calculatePlantPnlStatement } from "@/lib/pnl/calculate";
import { canViewPnl, isSuperAdmin, seesOwnEntriesOnly } from "@/lib/rbac";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ plantId: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  if (!canViewPnl(session.user.globalRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const fromParam = request.nextUrl.searchParams.get("from")?.trim();
  const toParam = request.nextUrl.searchParams.get("to")?.trim();
  const fromStr =
    fromParam && dateOnlyRegex.test(fromParam) ? fromParam : "2025-01-01";
  const toStr =
    toParam && dateOnlyRegex.test(toParam) ? toParam : todayDateString();

  try {
    const ownEntriesOnly = seesOwnEntriesOnly(session.user.globalRole);
    const [pnl, plant] = await Promise.all([
      calculatePlantPnlStatement(
        plantId,
        parseDateOnly(fromStr),
        parseDateOnly(toStr),
        {
          ...(ownEntriesOnly ? { enteredById: session.user.id } : {}),
          // Super Admin P&L uses approved entries only; plant managers see all plant data.
          approvedOnly: isSuperAdmin(session.user.globalRole),
        },
      ),
      prisma.plant.findUnique({
        where: { id: plantId },
        select: { name: true, code: true },
      }),
    ]);
    return NextResponse.json({
      from: fromStr,
      to: toStr,
      scope: ownEntriesOnly ? "own" : "all",
      plant,
      pnl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "P&L failed";
    return jsonError(message, 400);
  }
}
