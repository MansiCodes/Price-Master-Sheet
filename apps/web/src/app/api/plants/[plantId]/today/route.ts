import { NextRequest, NextResponse } from "next/server";
import {
  requirePlantAccess,
  requireSession,
} from "@/lib/api";
import { refreshDailyStatus } from "@/lib/daily-status";
import {
  dateOnlyRegex,
  parseDateOnly,
  todayDateString,
} from "@/lib/dates";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ plantId: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const dateStr =
    request.nextUrl.searchParams.get("date") ?? todayDateString();
  if (!dateOnlyRegex.test(dateStr)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const day = parseDateOnly(dateStr);
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true, name: true, code: true },
  });

  if (!plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }

  let status = await prisma.dailyEntryStatus.findUnique({
    where: { plantId_date: { plantId, date: day } },
  });

  if (!status) {
    status = await refreshDailyStatus(plantId, day);
  }

  const checklist = [
    { key: "purchase", label: "Purchase", filled: status.purchaseFilled, href: "purchase" },
    { key: "sale", label: "Sale", filled: status.saleFilled, href: "sale" },
    { key: "stock", label: "Stock", filled: status.stockFilled, href: "stock" },
    { key: "manpower", label: "Manpower", filled: status.manpowerFilled, href: "manpower" },
    { key: "pettyCash", label: "Petty Cash", filled: status.pettyCashFilled, href: "petty-cash" },
  ] as const;

  return NextResponse.json({
    plant,
    date: dateStr,
    status,
    checklist,
    allComplete: status.allComplete,
  });
}
