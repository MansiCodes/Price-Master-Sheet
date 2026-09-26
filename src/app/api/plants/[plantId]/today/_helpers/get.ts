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
import { isShiftApprovalRequired, resolveShiftApprovalFlags } from "@/lib/shift-approval-policy";
import { canViewAllPlantEntries } from "@/lib/rbac";
import {
  computeDayShiftCompletions,
  type ShiftKey,
} from "@/lib/shift-completion";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import { buildChecklist } from "./checklist";
import { loadRecentEntries } from "./load-recent-entries";
import { loadCustomLookups } from "./load-custom-lookups";

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

  const plantIds = await resolveReportPlantIds(plantId);
  const pScope = plantIdFilter(plantIds);

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

  const scopedUserId = canViewAllPlantEntries(session.user.globalRole)
    ? undefined
    : session.user.id;

  await refreshDailyStatusForDate(plantId, day);

  const shifts = await computeDayShiftCompletions({
    plantId,
    date: day,
    enteredById: scopedUserId,
  });

  const dailyStatuses = await prisma.dailyEntryStatus.findMany({
    where: { plantId, date: day },
    select: {
      id: true,
      shift: true,
      allComplete: true,
      purchaseFilled: true,
      saleFilled: true,
      stockFilled: true,
      productionFilled: true,
      pettyCashFilled: true,
      approvedByHead: true,
      approvedByAdmin: true,
      rejectedByHead: true,
      rejectedByAdmin: true,
      rejectionReason: true,
    },
  });

  const statusByShift = new Map(
    dailyStatuses.map((row) => [row.shift, row]),
  );

  const entryWhere = {
    ...pScope,
    date: day,
    ...(scopedUserId ? { enteredById: scopedUserId } : {}),
  };

  const recentEntries = await loadRecentEntries(entryWhere);

  function approvalPayload(shift: ShiftKey) {
    const row = statusByShift.get(shift);
    if (!row) return null;
    const flags = resolveShiftApprovalFlags(day, row);
    return {
      id: row.id,
      allComplete: row.allComplete,
      purchaseFilled: row.purchaseFilled,
      saleFilled: row.saleFilled,
      stockFilled: row.stockFilled,
      productionFilled: row.productionFilled,
      pettyCashFilled: row.pettyCashFilled,
      ...flags,
      rejectionReason: isShiftApprovalRequired(day) ? row.rejectionReason : null,
    };
  }

  const lookups = await loadCustomLookups(pScope);

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
        approval: approvalPayload("DAY"),
      },
      NIGHT: {
        modules: shifts.NIGHT.modules,
        completed: shifts.NIGHT.completed,
        total: shifts.NIGHT.total,
        allComplete: shifts.NIGHT.allComplete,
        checklist: buildChecklist("NIGHT", shifts.NIGHT.modules),
        approval: approvalPayload("NIGHT"),
      },
    },
    recentEntries,
    allComplete: shifts.DAY.allComplete && shifts.NIGHT.allComplete,
    ...lookups,
  });
}
