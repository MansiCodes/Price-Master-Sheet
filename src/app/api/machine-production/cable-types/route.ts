import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireMachineProductionAccess,
  requireMachineProductionEnter,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { ensureProcessMachineCableCatalog } from "@/lib/machine-production/ensure-cable-catalog";
import {
  CABLE_OTHERS_LABEL,
  upsertProcessMachineCableType,
} from "@/lib/machine-production/persist-cable-options";

const createSchema = z
  .object({
    machineId: z.string().min(1),
    processId: z.string().min(1).optional(),
    processName: z.string().trim().min(1).max(200).optional(),
    name: z.string().trim().min(1).max(120),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Boolean(d.processId || d.processName), {
    message: "processId or processName is required",
  });

async function resolveProcessMachine(opts: {
  machineId: string;
  processId?: string | null;
  processName?: string | null;
}) {
  const processFilter = opts.processId
    ? { id: opts.processId }
    : opts.processName
      ? { name: opts.processName }
      : null;
  if (!processFilter) return null;

  return prisma.productionProcessMachine.findFirst({
    where: {
      machineId: opts.machineId,
      process: processFilter,
    },
    include: { process: { select: { id: true, name: true } } },
  });
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user.globalRole);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const machineId = sp.get("machineId")?.trim();
  const processId = sp.get("processId")?.trim();
  const processName = sp.get("processName")?.trim();
  const all = sp.get("all") === "1";
  const isAdmin = session.user.globalRole === "SUPER_ADMIN";

  if (!machineId || (!processId && !processName)) {
    return NextResponse.json(
      { error: "machineId and processId (or processName) are required" },
      { status: 400 },
    );
  }

  const link = await resolveProcessMachine({
    machineId,
    processId,
    processName,
  });
  if (!link) {
    return NextResponse.json(
      { error: "This machine is not linked to that process" },
      { status: 404 },
    );
  }

  // Keep previous global cable options; seed them onto this link if empty,
  // and always ensure an Others option exists.
  await ensureProcessMachineCableCatalog(link.id);

  const types = await prisma.processMachineCableType.findMany({
    where: {
      processMachineId: link.id,
      ...(all && isAdmin ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    processMachineId: link.id,
    process: link.process,
    machineId: link.machineId,
    types: types.map((t) => ({
      id: t.id,
      processMachineId: t.processMachineId,
      name: t.name,
      sortOrder: t.sortOrder,
      isActive: t.isActive,
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

  const link = await resolveProcessMachine({
    machineId: parsed.data.machineId,
    processId: parsed.data.processId,
    processName: parsed.data.processName,
  });
  if (!link) {
    return NextResponse.json(
      { error: "This machine is not linked to that process" },
      { status: 404 },
    );
  }

  await ensureProcessMachineCableCatalog(link.id);

  if (parsed.data.name === CABLE_OTHERS_LABEL) {
    const others = await prisma.processMachineCableType.findUnique({
      where: {
        processMachineId_name: {
          processMachineId: link.id,
          name: CABLE_OTHERS_LABEL,
        },
      },
    });
    if (!others) {
      return NextResponse.json(
        { error: "Could not ensure Others option" },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      type: {
        id: others.id,
        processMachineId: others.processMachineId,
        name: others.name,
        sortOrder: others.sortOrder,
        isActive: others.isActive,
      },
    });
  }

  const type = await upsertProcessMachineCableType({
    processMachineId: link.id,
    name: parsed.data.name,
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
