import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireMachineProductionAdmin,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  /** When present, replaces the machine assignment wholesale. */
  machineIds: z.array(z.string().min(1)).optional(),
});

type Ctx = { params: Promise<{ processId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAdmin(session.user.globalRole);
  if (denied) return denied;

  const { processId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.productionProcess.findUnique({
    where: { id: processId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Process not found" }, { status: 404 });
  }

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const clash = await prisma.productionProcess.findUnique({
      where: { name: parsed.data.name },
    });
    if (clash) {
      return NextResponse.json(
        { error: "A process with that name already exists" },
        { status: 409 },
      );
    }
  }

  const machineIds = parsed.data.machineIds
    ? [...new Set(parsed.data.machineIds)]
    : null;
  if (machineIds && machineIds.length > 0) {
    const found = await prisma.machine.count({
      where: { id: { in: machineIds } },
    });
    if (found !== machineIds.length) {
      return NextResponse.json(
        { error: "One or more selected machines no longer exist" },
        { status: 400 },
      );
    }
  }

  const process = await prisma.$transaction(async (tx) => {
    await tx.productionProcess.update({
      where: { id: processId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.sortOrder !== undefined
          ? { sortOrder: parsed.data.sortOrder }
          : {}),
        ...(parsed.data.isActive !== undefined
          ? { isActive: parsed.data.isActive }
          : {}),
      },
    });

    if (machineIds) {
      // Replace the assignment set: drop links that were unticked, add new ones.
      await tx.productionProcessMachine.deleteMany({
        where: { processId, machineId: { notIn: machineIds } },
      });
      for (const [i, machineId] of machineIds.entries()) {
        await tx.productionProcessMachine.upsert({
          where: { processId_machineId: { processId, machineId } },
          create: { processId, machineId, sortOrder: i * 10 },
          update: { sortOrder: i * 10 },
        });
      }
    }

    return tx.productionProcess.findUniqueOrThrow({
      where: { id: processId },
      include: { machines: true },
    });
  });

  return NextResponse.json({
    ok: true,
    process: {
      id: process.id,
      name: process.name,
      sortOrder: process.sortOrder,
      isActive: process.isActive,
      machineCount: process.machines.length,
      machineIds: process.machines.map((m) => m.machineId),
    },
  });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAdmin(session.user.globalRole);
  if (denied) return denied;

  const { processId } = await ctx.params;
  const existing = await prisma.productionProcess.findUnique({
    where: { id: processId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Process not found" }, { status: 404 });
  }

  await prisma.productionProcess.delete({ where: { id: processId } });
  return NextResponse.json({ ok: true });
}
