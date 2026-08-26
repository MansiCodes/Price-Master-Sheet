import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireMachineProductionEnter,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { CABLE_OTHERS_LABEL } from "@/lib/machine-production/persist-cable-options";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ typeId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionEnter(session.user);
  if (denied) return denied;

  const { typeId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.processMachineCableType.findUnique({
    where: { id: typeId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Cable type not found" }, { status: 404 });
  }

  if (existing.name === CABLE_OTHERS_LABEL && parsed.data.name) {
    return NextResponse.json(
      { error: "Others cannot be renamed" },
      { status: 400 },
    );
  }

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const clash = await prisma.processMachineCableType.findUnique({
      where: {
        processMachineId_name: {
          processMachineId: existing.processMachineId,
          name: parsed.data.name,
        },
      },
    });
    if (clash) {
      return NextResponse.json(
        { error: "That cable type already exists for this process + machine" },
        { status: 409 },
      );
    }
  }

  const type = await prisma.processMachineCableType.update({
    where: { id: typeId },
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
    type: {
      id: type.id,
      processMachineId: type.processMachineId,
      name: type.name,
      sortOrder: type.sortOrder,
      isActive: type.isActive,
    },
  });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionEnter(session.user);
  if (denied) return denied;

  const { typeId } = await ctx.params;
  const existing = await prisma.processMachineCableType.findUnique({
    where: { id: typeId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Cable type not found" }, { status: 404 });
  }
  if (existing.name === CABLE_OTHERS_LABEL) {
    return NextResponse.json(
      { error: "Others cannot be removed" },
      { status: 400 },
    );
  }

  await prisma.processMachineCableType.update({
    where: { id: typeId },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
