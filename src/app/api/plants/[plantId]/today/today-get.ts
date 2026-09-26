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
import { buildChecklist } from "./today-checklist";
import { loadCustomCatalog } from "./today-custom-catalog";

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

  const [purchaseRows, saleRows, stockRows, expenseRows] = await Promise.all([
    prisma.purchase.findMany({
      where: entryWhere,
      select: {
        id: true,
        shift: true,
        itemDescription: true,
        invoiceValue: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.sale.findMany({
      where: entryWhere,
      select: {
        id: true,
        shift: true,
        customerName: true,
        salesValue: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.stockEntry.findMany({
      where: entryWhere,
      select: {
        id: true,
        shift: true,
        itemName: true,
        closingValue: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.pettyCashEntry.findMany({
      where: { ...entryWhere, entryType: { in: ["EXPENSE", "PETTY_CASH"] } },
      select: {
        id: true,
        shift: true,
        expenseHead: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  type TodayEntryRow = {
    id: string;
    shift: string;
    kind: string;
    label: string;
    amount: number;
    createdAt: string;
  };

  const recentEntries: TodayEntryRow[] = [
    ...purchaseRows.map((row) => ({
      id: row.id,
      shift: row.shift,
      kind: "Purchase",
      label: row.itemDescription,
      amount: Number(row.invoiceValue) || 0,
      createdAt: row.createdAt.toISOString(),
    })),
    ...saleRows.map((row) => ({
      id: row.id,
      shift: row.shift,
      kind: "Sales",
      label: row.customerName,
      amount: Number(row.salesValue) || 0,
      createdAt: row.createdAt.toISOString(),
    })),
    ...stockRows.map((row) => ({
      id: row.id,
      shift: row.shift,
      kind: "Stock",
      label: row.itemName,
      amount: Number(row.closingValue) || 0,
      createdAt: row.createdAt.toISOString(),
    })),
    ...expenseRows.map((row) => ({
      id: row.id,
      shift: row.shift,
      kind: "Expense",
      label: row.expenseHead,
      amount: Number(row.amount) || 0,
      createdAt: row.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);

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

  const lookups = await loadCustomCatalog(pScope);

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
