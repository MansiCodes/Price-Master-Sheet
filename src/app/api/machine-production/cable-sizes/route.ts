import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireMachineProductionAccess,
  requireMachineProductionEnter,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  CABLE_OTHERS_LABEL,
  upsertProcessMachineCableSize,
} from "@/lib/machine-production/persist-cable-options";

const createSchema = z.object({
  cableTypeId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user.globalRole);
  if (denied) return denied;

  const cableTypeId = request.nextUrl.searchParams.get("cableTypeId")?.trim();
  if (!cableTypeId) {
    return NextResponse.json(
      { error: "cableTypeId is required" },
      { status: 400 },
    );
  }

  const all = request.nextUrl.searchParams.get("all") === "1";
  const isAdmin = session.user.globalRole === "SUPER_ADMIN";

  const cableType = await prisma.processMachineCableType.findUnique({
    where: { id: cableTypeId },
  });
  if (!cableType) {
    return NextResponse.json({ error: "Cable type not found" }, { status: 404 });
  }

  const othersSize = await prisma.processMachineCableSize.findUnique({
    where: {
      cableTypeId_name: { cableTypeId, name: CABLE_OTHERS_LABEL },
    },
  });
  if (!othersSize) {
    const maxSort = await prisma.processMachineCableSize.aggregate({
      where: { cableTypeId },
      _max: { sortOrder: true },
    });
    await prisma.processMachineCableSize.create({
      data: {
        cableTypeId,
        name: CABLE_OTHERS_LABEL,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
        isActive: true,
      },
    });
  } else if (!othersSize.isActive && !(all && isAdmin)) {
    await prisma.processMachineCableSize.update({
      where: { id: othersSize.id },
      data: { isActive: true },
    });
  }

  const sizes = await prisma.processMachineCableSize.findMany({
    where: {
      cableTypeId,
      ...(all && isAdmin ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    cableTypeId,
    sizes: sizes.map((s) => ({
      id: s.id,
      cableTypeId: s.cableTypeId,
      name: s.name,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
    })),
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

  if (parsed.data.name === CABLE_OTHERS_LABEL) {
    const others = await prisma.processMachineCableSize.findUnique({
      where: {
        cableTypeId_name: {
          cableTypeId: parsed.data.cableTypeId,
          name: CABLE_OTHERS_LABEL,
        },
      },
    });
    if (!others) {
      const created = await prisma.processMachineCableSize.create({
        data: {
          cableTypeId: parsed.data.cableTypeId,
          name: CABLE_OTHERS_LABEL,
          sortOrder: 9990,
          isActive: true,
        },
      });
      return NextResponse.json({
        ok: true,
        size: {
          id: created.id,
          cableTypeId: created.cableTypeId,
          name: created.name,
          sortOrder: created.sortOrder,
          isActive: created.isActive,
        },
      });
    }
    if (!others.isActive) {
      const updated = await prisma.processMachineCableSize.update({
        where: { id: others.id },
        data: { isActive: true },
      });
      return NextResponse.json({
        ok: true,
        size: {
          id: updated.id,
          cableTypeId: updated.cableTypeId,
          name: updated.name,
          sortOrder: updated.sortOrder,
          isActive: updated.isActive,
        },
      });
    }
    return NextResponse.json({
      ok: true,
      size: {
        id: others.id,
        cableTypeId: others.cableTypeId,
        name: others.name,
        sortOrder: others.sortOrder,
        isActive: others.isActive,
      },
    });
  }

  const cableType = await prisma.processMachineCableType.findUnique({
    where: { id: parsed.data.cableTypeId },
  });
  if (!cableType) {
    return NextResponse.json({ error: "Cable type not found" }, { status: 404 });
  }

  const size = await upsertProcessMachineCableSize({
    cableTypeId: parsed.data.cableTypeId,
    name: parsed.data.name,
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
