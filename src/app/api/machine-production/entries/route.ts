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
  remarks: z.string().trim().max(2000).optional().nullable(),
  photoUrls: z.array(z.string().url()).max(3).optional(),
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
    remarks: string | null;
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
    remarks: entry.remarks,
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

  const denied = requireMachineProductionAccess(session.user.globalRole);
  if (denied) return denied;

  const isAdmin = canAdminMachineProduction(session.user.globalRole);
  const sp = request.nextUrl.searchParams;

  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  const shift = sp.get("shift");
  const machineId = sp.get("machineId");
  const supervisorId = sp.get("supervisorId");
  const cableType = sp.get("cableType");
  const statusFilter = sp.get("status");
  const take = Math.min(Number(sp.get("take") ?? 100) || 100, 300);

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
  if (machineId) where.machineId = machineId;
  if (cableType?.trim()) {
    where.cableType = { contains: cableType.trim(), mode: "insensitive" };
  }

  const rows = await prisma.machineProductionEntry.findMany({
    where,
    orderBy: [{ entryDate: "desc" }, { submittedAt: "desc" }],
    take,
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
  const avgEff =
    entries.length === 0
      ? 0
      : Math.round(
          (entries.reduce((s, e) => s + e.efficiencyPct, 0) / entries.length) *
            100,
        ) / 100;

  return NextResponse.json({
    ok: true,
    summary: {
      total: entries.length,
      completed: entries.filter((e) => e.status === "COMPLETED").length,
      pending: entries.filter((e) => e.status === "PENDING").length,
      overdue: entries.filter((e) => e.status === "OVERDUE").length,
      actualProduction: Math.round(actualSum * 10000) / 10000,
      averageEfficiency: avgEff,
    },
    entries,
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionEnter(session.user.globalRole);
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

  const processRow = await prisma.machineProcess.findFirst({
    where: {
      machineId: machine.id,
      name: parsed.data.currentProcess,
      isActive: true,
    },
  });
  if (!processRow) {
    return NextResponse.json(
      { error: "Select a valid current process for this machine" },
      { status: 400 },
    );
  }

  const cableTypeRow = await prisma.machineCableType.findFirst({
    where: {
      name: parsed.data.cableType,
      isActive: true,
    },
  });
  if (!cableTypeRow) {
    return NextResponse.json(
      { error: "Select a valid cable type" },
      { status: 400 },
    );
  }

  const cableSizeRow = await prisma.machineCableSize.findFirst({
    where: {
      cableTypeId: cableTypeRow.id,
      name: parsed.data.cableSize,
      isActive: true,
    },
  });
  if (!cableSizeRow) {
    return NextResponse.json(
      { error: "Select a valid cable size for this cable type" },
      { status: 400 },
    );
  }

  const photos = (parsed.data.photoUrls ?? []).filter((u) =>
    isCloudinaryBillUrl(u),
  );

  const planned = parsed.data.plannedProduction;
  const actual = parsed.data.actualProduction;
  const operators = parsed.data.operators;
  const helpers = parsed.data.helpers;
  const totalManpower = operators + helpers;
  const eff = efficiencyPct(planned, actual);
  const now = new Date();

  try {
    const entry = await prisma.machineProductionEntry.create({
      data: {
        machineId: machine.id,
        supervisorId: session.user.id,
        entryDate: parseDateOnlyUtc(entryDate),
        shift,
        slotStartHour,
        currentProcess: processRow.name,
        cableType: cableTypeRow.name,
        cableSize: cableSizeRow.name,
        plannedProduction: planned,
        actualProduction: actual,
        efficiencyPct: eff,
        operators,
        helpers,
        totalManpower,
        remarks: parsed.data.remarks || null,
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
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "Production already submitted for this machine, date, shift, and slot",
        },
        { status: 409 },
      );
    }
    throw err;
  }
}
