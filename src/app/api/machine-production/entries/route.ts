import { NextRequest, NextResponse } from "next/server";
import { MachineProductionShift, Prisma } from "@prisma/client";
import { z } from "zod";
import {
  requireMachineProductionAccess,
  requireMachineProductionEnter,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { isCloudinaryBillUrl } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import { canAdminMachineProduction } from "@/lib/rbac";
import {
  buildSlotContext,
  DAY_SLOT_HOURS,
  efficiencyPct,
  NIGHT_SLOT_HOURS,
  parseDateOnlyUtc,
  resolveCurrentSlot,
  resolveSlotStatus,
  shiftDisplayLabel,
  slotWindowLabel,
} from "@/lib/machine-production/slots";
import { paginate } from "@/lib/ui/paginate";

const createSchema = z.object({
  machineId: z.string().min(1),
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  shift: z.enum(["DAY", "NIGHT"]).optional(),
  slotStartHour: z.number().int().optional(),
  cableType: z.string().trim().min(1).max(120),
  cableSize: z.string().trim().min(1).max(80),
  currentProcess: z.string().trim().min(1).max(200),
  plannedProduction: z.number().finite().nonnegative(),
  actualProduction: z.number().finite().nonnegative(),
  operators: z.number().int().nonnegative(),
  helpers: z.number().int().nonnegative(),
  operatorName: z.string().trim().min(1).max(120),
  remarks: z.string().trim().max(2000).optional().nullable(),
  coilNo: z.string().trim().max(100).optional().nullable(),
  weight: z.number().finite().nonnegative().optional().nullable(),
  photoUrls: z.array(z.string().url()).max(20).optional(),
});

function serializeEntry(
  entry: {
    id: string;
    machineId: string;
    supervisorId: string;
    entryDate: Date;
    shift: MachineProductionShift;
    slotStartHour: number;
    currentProcess: string;
    cableType: string;
    cableSize: string;
    plannedProduction: Prisma.Decimal;
    actualProduction: Prisma.Decimal;
    efficiencyPct: Prisma.Decimal;
    operators: number;
    helpers: number;
    totalManpower: number;
    operatorName: string | null;
    remarks: string | null;
    coilNo: string | null;
    weight: Prisma.Decimal | null;
    photoUrls: string[];
    submittedAt: Date;
    createdAt: Date;
    machine?: { id: string; name: string; code: string };
    supervisor?: { id: string; name: string | null; email: string };
  },
  now = new Date(),
) {
  const entryDate = entry.entryDate.toISOString().slice(0, 10);
  const slot = buildSlotContext(entry.shift, entryDate, entry.slotStartHour);
  const status = resolveSlotStatus({
    submitted: true,
    deadlineIso: slot.deadlineIso,
    now,
  });

  return {
    id: entry.id,
    machineId: entry.machineId,
    machine: entry.machine
      ? {
          id: entry.machine.id,
          name: entry.machine.name,
          code: entry.machine.code,
        }
      : undefined,
    supervisorId: entry.supervisorId,
    supervisor: entry.supervisor
      ? {
          id: entry.supervisor.id,
          name: entry.supervisor.name,
          email: entry.supervisor.email,
        }
      : undefined,
    entryDate,
    shift: entry.shift,
    shiftLabel: shiftDisplayLabel(entry.shift),
    slotStartHour: entry.slotStartHour,
    slotLabel: slotWindowLabel(entry.slotStartHour),
    currentProcess: entry.currentProcess,
    cableType: entry.cableType,
    cableSize: entry.cableSize,
    plannedProduction: Number(entry.plannedProduction),
    actualProduction: Number(entry.actualProduction),
    efficiencyPct: Number(entry.efficiencyPct),
    operators: entry.operators,
    helpers: entry.helpers,
    totalManpower: entry.totalManpower,
    operatorName: entry.operatorName,
    remarks: entry.remarks,
    coilNo: entry.coilNo,
    weight: entry.weight ? Number(entry.weight) : null,
    photoUrls: entry.photoUrls,
    submittedAt: entry.submittedAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    status,
    deadlineIso: slot.deadlineIso,
    deadlineLabel: slot.deadlineLabel,
  };
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user);
  if (denied) return denied;

  const isAdmin = canAdminMachineProduction(session.user.globalRole);
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

export async function POST(request: Request) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionEnter(session.user);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const current = resolveCurrentSlot();
  const shift = (parsed.data.shift ?? current.shift) as MachineProductionShift;
  const entryDate = parsed.data.entryDate ?? current.entryDate;
  const slotStartHour = parsed.data.slotStartHour ?? current.slotStartHour;

  const allowedHours =
    shift === "DAY" ? DAY_SLOT_HOURS : NIGHT_SLOT_HOURS;
  if (!(allowedHours as readonly number[]).includes(slotStartHour)) {
    return NextResponse.json(
      { error: `Invalid slot for ${shift} shift` },
      { status: 400 },
    );
  }

  const machine = await prisma.machine.findFirst({
    where: { id: parsed.data.machineId, isActive: true },
  });
  if (!machine) {
    return NextResponse.json(
      { error: "Machine not found or inactive" },
      { status: 404 },
    );
  }

  // The machine must actually be assigned to the process the entry claims.
  const processLink = await prisma.productionProcessMachine.findFirst({
    where: {
      machineId: machine.id,
      process: { name: parsed.data.currentProcess, isActive: true },
    },
    include: { process: { select: { name: true } } },
  });
  if (!processLink) {
    return NextResponse.json(
      { error: "This machine is not assigned to that process" },
      { status: 400 },
    );
  }

  const photos = (parsed.data.photoUrls ?? []).filter((u) =>
    isCloudinaryBillUrl(u),
  );

  // Others free-text becomes a permanent dropdown option for this process+machine.
  const { persistOthersCableOptions } = await import(
    "@/lib/machine-production/persist-cable-options"
  );
  const persisted = await persistOthersCableOptions({
    processMachineId: processLink.id,
    cableType: parsed.data.cableType,
    cableSize: parsed.data.cableSize,
  });

  const planned = parsed.data.plannedProduction;
  const actual = parsed.data.actualProduction;
  const operators = parsed.data.operators;
  const helpers = parsed.data.helpers;
  const totalManpower = operators + helpers;
  const eff = efficiencyPct(planned, actual);
  const now = new Date();

  const entry = await prisma.machineProductionEntry.create({
    data: {
      machineId: machine.id,
      supervisorId: session.user.id,
      entryDate: parseDateOnlyUtc(entryDate),
      shift,
      slotStartHour,
      currentProcess: processLink.process.name,
      cableType: persisted.cableType,
      cableSize: persisted.cableSize,
      plannedProduction: planned,
      actualProduction: actual,
      efficiencyPct: eff,
      operators,
      helpers,
      totalManpower,
      operatorName: parsed.data.operatorName,
      remarks: parsed.data.remarks || null,
      coilNo: parsed.data.coilNo || null,
      weight: parsed.data.weight ?? null,
      photoUrls: photos,
      submittedAt: now,
    },
    include: {
      machine: { select: { id: true, name: true, code: true } },
      supervisor: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    entry: serializeEntry(entry, now),
  });
}
