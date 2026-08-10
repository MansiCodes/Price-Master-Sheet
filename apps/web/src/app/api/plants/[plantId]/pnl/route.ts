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
import { calculatePlantPnl } from "@/lib/pnl/calculate";
import { canViewPnl } from "@/lib/rbac";

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
    const pnl = await calculatePlantPnl(
      plantId,
      parseDateOnly(fromStr),
      parseDateOnly(toStr),
    );
    return NextResponse.json({ from: fromStr, to: toStr, pnl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "P&L failed";
    return jsonError(message, 400);
  }
}
