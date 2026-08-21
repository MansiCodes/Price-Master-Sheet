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

  const existing = await prisma.machineProcess.findUnique({
    where: { id: processId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Process not found" }, { status: 404 });
  }

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const clash = await prisma.machineProcess.findUnique({
      where: {
        machineId_name: {
          machineId: existing.machineId,
          name: parsed.data.name,
        },
      },
    });
    if (clash) {
      return NextResponse.json(
        { error: "This machine already has that process" },
        { status: 409 },
      );
    }
  }

  const process = await prisma.machineProcess.update({
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

  return NextResponse.json({
    ok: true,
    process: {
      id: process.id,
      machineId: process.machineId,
      name: process.name,
      sortOrder: process.sortOrder,
      isActive: process.isActive,
    },
  });
}
