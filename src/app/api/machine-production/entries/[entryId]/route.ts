import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  requireMachineProductionAdmin,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { isCloudinaryBillUrl } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";
import { efficiencyPct } from "@/lib/machine-production/slots";

const patchSchema = z.object({
  currentProcess: z.string().trim().min(1).max(200).optional(),
  cableType: z.string().trim().min(1).max(120).optional(),
  cableSize: z.string().trim().min(1).max(80).optional(),
  plannedProduction: z.number().finite().nonnegative().optional(),
  actualProduction: z.number().finite().nonnegative().optional(),
  operators: z.number().int().nonnegative().optional(),
  helpers: z.number().int().nonnegative().optional(),
  remarks: z.string().trim().max(2000).optional().nullable(),
  photoUrls: z.array(z.string().url()).max(20).optional(),
});

type Ctx = { params: Promise<{ entryId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAdmin(session.user.globalRole);
  if (denied) return denied;

  const { entryId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.machineProductionEntry.findUnique({
    where: { id: entryId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const nextProcess = parsed.data.currentProcess ?? existing.currentProcess;
  const nextCableType = parsed.data.cableType ?? existing.cableType;
  const nextCableSize = parsed.data.cableSize ?? existing.cableSize;
  const planned =
    parsed.data.plannedProduction ?? Number(existing.plannedProduction);
  const actual =
    parsed.data.actualProduction ?? Number(existing.actualProduction);
  const operators = parsed.data.operators ?? existing.operators;
  const helpers = parsed.data.helpers ?? existing.helpers;

  const processLink = await prisma.productionProcessMachine.findFirst({
    where: {
      machineId: existing.machineId,
      process: { name: nextProcess, isActive: true },
    },
    include: { process: { select: { name: true } } },
  });
  if (!processLink) {
    return NextResponse.json(
      { error: "This machine is not assigned to that process" },
      { status: 400 },
    );
  }

  const cableTypeRow = await prisma.machineCableType.findFirst({
    where: { name: nextCableType, isActive: true },
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
      name: nextCableSize,
      isActive: true,
    },
  });
  if (!cableSizeRow) {
    return NextResponse.json(
      { error: "Select a valid cable size for this cable type" },
      { status: 400 },
    );
  }

  const photos =
    parsed.data.photoUrls !== undefined
      ? parsed.data.photoUrls.filter((u) => isCloudinaryBillUrl(u))
      : undefined;

  const entry = await prisma.machineProductionEntry.update({
    where: { id: entryId },
    data: {
      currentProcess: processLink.process.name,
      cableType: cableTypeRow.name,
      cableSize: cableSizeRow.name,
      plannedProduction: planned,
      actualProduction: actual,
      efficiencyPct: efficiencyPct(planned, actual),
      operators,
      helpers,
      totalManpower: operators + helpers,
      ...(parsed.data.remarks !== undefined
        ? { remarks: parsed.data.remarks || null }
        : {}),
      ...(photos !== undefined ? { photoUrls: photos } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    entry: {
      id: entry.id,
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
    },
  });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAdmin(session.user.globalRole);
  if (denied) return denied;

  const { entryId } = await ctx.params;

  try {
    await prisma.machineProductionEntry.delete({ where: { id: entryId } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
