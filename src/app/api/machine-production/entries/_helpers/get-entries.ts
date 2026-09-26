import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  requireMachineProductionAccess,
  requireSession,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { canAdminMachineProduction } from "@/lib/rbac";
import { parseDateOnlyUtc } from "@/lib/machine-production/slots";
import { paginate } from "@/lib/ui/paginate";
import { serializeEntry } from "./serialize-entry";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user);
  if (denied) return denied;

  const isAdmin = canAdminMachineProduction(session.user.globalRole, {
    canAdminMachineProduction: session.user.canAdminMachineProduction,
  });
  const sp = request.nextUrl.searchParams;

  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  const shift = sp.get("shift");
  const slotStartHourRaw = sp.get("slotStartHour");
  const machineId = sp.get("machineId");
  const supervisorId = sp.get("supervisorId");
  const operatorName = sp.get("operatorName");
  const cableType = sp.get("cableType");
  const statusFilter = sp.get("status");
  const page = Number(sp.get("page")) || 1;
  const pageSize = Math.min(Math.max(Number(sp.get("pageSize")) || 20, 1), 500);

  const where: Prisma.MachineProductionEntryWhereInput = {};
  if (!isAdmin) {
    where.supervisorId = session.user.id;
  } else if (supervisorId) {
    where.supervisorId = supervisorId;
  }

  if (dateFrom || dateTo) {
    where.entryDate = {};
    if (dateFrom) where.entryDate.gte = parseDateOnlyUtc(dateFrom);
    if (dateTo) where.entryDate.lte = parseDateOnlyUtc(dateTo);
  }
  if (shift === "DAY" || shift === "NIGHT") {
    where.shift = shift;
  }
  if (slotStartHourRaw != null && slotStartHourRaw !== "") {
    const hour = Number(slotStartHourRaw);
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
      where.slotStartHour = hour;
    }
  }
  if (machineId) where.machineId = machineId;
  if (operatorName?.trim()) {
    where.operatorName = {
      contains: operatorName.trim(),
      mode: "insensitive",
    };
  }
  if (cableType?.trim()) {
    where.cableType = { contains: cableType.trim(), mode: "insensitive" };
  }

  const rows = await prisma.machineProductionEntry.findMany({
    where,
    orderBy: [{ entryDate: "desc" }, { submittedAt: "desc" }],
    include: {
      machine: { select: { id: true, name: true, code: true } },
      supervisor: { select: { id: true, name: true, email: true } },
    },
  });

  const now = new Date();
  let entries = rows.map((r) => serializeEntry(r, now));

  if (
    statusFilter === "PENDING" ||
    statusFilter === "COMPLETED" ||
    statusFilter === "OVERDUE"
  ) {
    // Submitted rows are always COMPLETED; PENDING/OVERDUE only for virtual board.
    // For admin list of submissions, COMPLETED is the only real status.
    // Still allow filter for consistency with dashboard wording.
    entries = entries.filter((e) => e.status === statusFilter);
  }

  const actualSum = entries.reduce((s, e) => s + e.actualProduction, 0);
  const plannedSum = entries.reduce((s, e) => s + e.plannedProduction, 0);
  const avgEff =
    entries.length === 0
      ? 0
      : Math.round(
          (entries.reduce((s, e) => s + e.efficiencyPct, 0) / entries.length) *
            100,
        ) / 100;

  const dayMap = new Map<
    string,
    { planned: number; actual: number; count: number; effSum: number }
  >();
  for (const e of entries) {
    const cur = dayMap.get(e.entryDate) ?? {
      planned: 0,
      actual: 0,
      count: 0,
      effSum: 0,
    };
    cur.planned += e.plannedProduction;
    cur.actual += e.actualProduction;
    cur.count += 1;
    cur.effSum += e.efficiencyPct;
    dayMap.set(e.entryDate, cur);
  }
  const dayWise = [...dayMap.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, d]) => ({
      date,
      entries: d.count,
      plannedProduction: Math.round(d.planned * 10000) / 10000,
      actualProduction: Math.round(d.actual * 10000) / 10000,
      averageEfficiency:
        d.count === 0
          ? 0
          : d.planned > 0
            ? Math.round((d.actual / d.planned) * 10000) / 100
            : Math.round((d.effSum / d.count) * 100) / 100,
    }));

  type MachineDayAgg = {
    date: string;
    machineId: string;
    machineName: string;
    machineCode: string;
    entries: number;
    plannedProduction: number;
    actualProduction: number;
    efficiencyPct: number;
    slots: typeof entries;
  };
  const machineDayMap = new Map<string, MachineDayAgg>();
  for (const e of entries) {
    const machineId = e.machineId;
    const key = `${e.entryDate}|${machineId}`;
    const cur = machineDayMap.get(key);
    if (!cur) {
      machineDayMap.set(key, {
        date: e.entryDate,
        machineId,
        machineName: e.machine?.name ?? "—",
        machineCode: e.machine?.code ?? "",
        entries: 1,
        plannedProduction: e.plannedProduction,
        actualProduction: e.actualProduction,
        efficiencyPct: e.efficiencyPct,
        slots: [e],
      });
    } else {
      cur.entries += 1;
      cur.plannedProduction += e.plannedProduction;
      cur.actualProduction += e.actualProduction;
      cur.slots.push(e);
    }
  }
  const machineDayWise = [...machineDayMap.values()]
    .map((row) => ({
      ...row,
      plannedProduction: Math.round(row.plannedProduction * 10000) / 10000,
      actualProduction: Math.round(row.actualProduction * 10000) / 10000,
      efficiencyPct:
        row.plannedProduction > 0
          ? Math.round(
              (row.actualProduction / row.plannedProduction) * 10000,
            ) / 100
          : Math.round(
              (row.slots.reduce((s, x) => s + x.efficiencyPct, 0) /
                Math.max(row.slots.length, 1)) *
                100,
            ) / 100,
      slots: row.slots.sort((a, b) => {
        if (a.shift !== b.shift) return a.shift === "DAY" ? -1 : 1;
        return a.slotStartHour - b.slotStartHour;
      }),
    }))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.machineName.localeCompare(b.machineName);
    });

  const { slice, ...pageInfo } = paginate(machineDayWise, page, pageSize);

  return NextResponse.json({
    ok: true,
    summary: {
      total: entries.length,
      completed: entries.filter((e) => e.status === "COMPLETED").length,
      pending: entries.filter((e) => e.status === "PENDING").length,
      overdue: entries.filter((e) => e.status === "OVERDUE").length,
      plannedProduction: Math.round(plannedSum * 10000) / 10000,
      actualProduction: Math.round(actualSum * 10000) / 10000,
      averageEfficiency:
        plannedSum > 0
          ? Math.round((actualSum / plannedSum) * 10000) / 100
          : avgEff,
    },
    dayWise,
    machineDayWise: slice,
    // Flat entries for PDF / compatibility (current page's slots).
    entries: slice.flatMap((m) => m.slots),
    ...pageInfo,
  });
}
