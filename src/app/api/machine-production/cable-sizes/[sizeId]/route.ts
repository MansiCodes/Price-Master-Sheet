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

type Ctx = { params: Promise<{ sizeId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionEnter(session.user.globalRole);
  if (denied) return denied;

  const { sizeId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.processMachineCableSize.findUnique({
    where: { id: sizeId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Cable size not found" }, { status: 404 });
  }

  if (existing.name === CABLE_OTHERS_LABEL && parsed.data.name) {
    return NextResponse.json(
      { error: "Others cannot be renamed" },
      { status: 400 },
    );
  }

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const clash = await prisma.processMachineCableSize.findUnique({
      where: {
        cableTypeId_name: {
          cableTypeId: existing.cableTypeId,
          name: parsed.data.name,
        },
      },
    });
    if (clash) {
      return NextResponse.json(
        { error: "That size already exists for this cable type" },
        { status: 409 },
      );
    }
  }

  const size = await prisma.processMachineCableSize.update({
    where: { id: sizeId },
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
    size: {
      id: size.id,
      cableTypeId: size.cableTypeId,
      name: size.name,
      sortOrder: size.sortOrder,
      isActive: size.isActive,
    },
  });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionEnter(session.user.globalRole);
  if (denied) return denied;

  const { sizeId } = await ctx.params;
  const existing = await prisma.processMachineCableSize.findUnique({
    where: { id: sizeId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Cable size not found" }, { status: 404 });
  }
  if (existing.name === CABLE_OTHERS_LABEL) {
    return NextResponse.json(
      { error: "Others cannot be removed" },
      { status: 400 },
    );
  }

  await prisma.processMachineCableSize.update({
    where: { id: sizeId },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
