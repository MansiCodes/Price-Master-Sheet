import { NextRequest, NextResponse } from "next/server";
import {
  requirePlantAccess,
  requireSession,
} from "@/lib/api";
import { refreshDailyStatusForDate } from "@/lib/daily-status";
import {
  dateOnlyRegex,
  parseDateOnly,
  todayDateString,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac";
import {
  computeDayShiftCompletions,
  type ShiftKey,
} from "@/lib/shift-completion";

type RouteContext = { params: Promise<{ plantId: string }> };

const CHECKLIST_KEYS = [
  { key: "purchaseFilled", label: "Purchase", href: "purchase" },
  { key: "saleFilled", label: "Sales", href: "sale" },
  { key: "stockFilled", label: "Stock", href: "stock" },
  { key: "productionFilled", label: "Production", href: "production" },
  { key: "pettyCashFilled", label: "Petty Cash", href: "petty-cash" },
] as const;

function buildChecklist(
  shift: ShiftKey,
  modules: Awaited<
    ReturnType<typeof computeDayShiftCompletions>
  >[ShiftKey]["modules"],
) {
  return CHECKLIST_KEYS.map((item) => {
    const mod = modules.find((m) => m.key === item.key);
    return {
      shift,
      key: item.key.replace("Filled", ""),
      label: item.label,
      filled: mod?.filled ?? false,
      href: item.href,
    };
  });
}

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

  const scopedUserId = isSuperAdmin(session.user.globalRole)
    ? undefined
    : session.user.id;

  if (!scopedUserId) {
    await refreshDailyStatusForDate(plantId, day);
  }

  const shifts = await computeDayShiftCompletions({
    plantId,
    date: day,
    enteredById: scopedUserId,
  });

  return NextResponse.json({
    plant,
    date: dateStr,
    shifts: {
      DAY: {
        modules: shifts.DAY.modules,
        completed: shifts.DAY.completed,
        total: shifts.DAY.total,
        allComplete: shifts.DAY.allComplete,
        checklist: buildChecklist("DAY", shifts.DAY.modules),
      },
      NIGHT: {
        modules: shifts.NIGHT.modules,
        completed: shifts.NIGHT.completed,
        total: shifts.NIGHT.total,
        allComplete: shifts.NIGHT.allComplete,
        checklist: buildChecklist("NIGHT", shifts.NIGHT.modules),
      },
    },
    allComplete: shifts.DAY.allComplete && shifts.NIGHT.allComplete,
  });
}
