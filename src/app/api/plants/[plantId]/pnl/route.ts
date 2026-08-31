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
import { canViewPnl, isAdminOrHead } from "@/lib/rbac";
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

  const fromStr =
    request.nextUrl.searchParams.get("from") ?? todayDateString();
  const toStr = request.nextUrl.searchParams.get("to") ?? fromStr;

  if (!dateOnlyRegex.test(fromStr) || !dateOnlyRegex.test(toStr)) {
    return jsonError("Invalid from/to date", 400);
  }

  try {
    const isAdminOrHeadUser = isAdminOrHead(session.user.globalRole);
    const ownEntriesOnly = !isAdminOrHeadUser;
    const [pnl, plant] = await Promise.all([
      calculatePlantPnlStatement(
        plantId,
        parseDateOnly(fromStr),
        parseDateOnly(toStr),
        {
          ...(ownEntriesOnly ? { enteredById: session.user.id } : {}),
          approvedOnly: false,
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
