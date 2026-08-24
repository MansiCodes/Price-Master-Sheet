import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireMachineProductionAdmin,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ machineId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAdmin(session.user.globalRole);
  if (denied) return denied;

  const { machineId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!existing) {
    return NextResponse.json({ error: "Machine not found" }, { status: 404 });
  }

  const machine = await prisma.machine.update({
    where: { id: machineId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description || null }
        : {}),
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    machine: {
      id: machine.id,
      name: machine.name,
      code: machine.code,
      description: machine.description,
      isActive: machine.isActive,
      createdAt: machine.createdAt.toISOString(),
      updatedAt: machine.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAdmin(session.user.globalRole);
  if (denied) return denied;

  const { machineId } = await ctx.params;
  const existing = await prisma.machine.findUnique({
    where: { id: machineId },
    include: { _count: { select: { entries: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Machine not found" }, { status: 404 });
  }
  if (existing._count.entries > 0) {
    return NextResponse.json(
      {
        error:
          "This machine has production entries. Deactivate it instead of deleting.",
      },
      { status: 409 },
    );
  }

  await prisma.machine.delete({ where: { id: machineId } });
  return NextResponse.json({ ok: true });
}
