import { NextResponse } from "next/server";
import { MachineProductionShift } from "@prisma/client";
import { z } from "zod";
import {
  requireMachineProductionEnter,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { safeWriteAuditLog } from "@/lib/audit";
import { isAllowedMediaUrl } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import {
  DAY_SLOT_HOURS,
  efficiencyPct,
  NIGHT_SLOT_HOURS,
  parseDateOnlyUtc,
  resolveCurrentSlot,
} from "@/lib/machine-production/slots";
import { serializeEntry } from "./serialize-entry";

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
    isAllowedMediaUrl(u),
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

  await safeWriteAuditLog({
    entityType: "MachineProductionEntry",
    entityId: entry.id,
    field: "create",
    newValue: {
      currentProcess: entry.currentProcess,
      machine: entry.machine?.name,
      cableType: entry.cableType,
      cableSize: entry.cableSize,
      plannedProduction: Number(entry.plannedProduction),
      actualProduction: Number(entry.actualProduction),
      operatorName: entry.operatorName,
      shift: entry.shift,
      entryDate,
    },
    actorId: session.user.id,
  });

  return NextResponse.json({
    ok: true,
    entry: serializeEntry(entry, now),
  });
}
