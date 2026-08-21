import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireMachineProductionAccess,
  requireMachineProductionAdmin,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  machineId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user.globalRole);
  if (denied) return denied;

  const machineId = request.nextUrl.searchParams.get("machineId")?.trim();
  if (!machineId) {
    return NextResponse.json(
      { error: "machineId is required" },
      { status: 400 },
    );
  }

  const all = request.nextUrl.searchParams.get("all") === "1";
  const isAdmin = session.user.globalRole === "SUPER_ADMIN";

  const processes = await prisma.machineProcess.findMany({
    where: {
      machineId,
      ...(all && isAdmin ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    machineId,
    processes: processes.map((p) => ({
      id: p.id,
      machineId: p.machineId,
      name: p.name,
      sortOrder: p.sortOrder,
      isActive: p.isActive,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAdmin(session.user.globalRole);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const machine = await prisma.machine.findUnique({
    where: { id: parsed.data.machineId },
  });
  if (!machine) {
    return NextResponse.json({ error: "Machine not found" }, { status: 404 });
  }

  const name = parsed.data.name;
  const existing = await prisma.machineProcess.findUnique({
    where: {
      machineId_name: { machineId: parsed.data.machineId, name },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This machine already has that process" },
      { status: 409 },
    );
  }

  const maxSort = await prisma.machineProcess.aggregate({
    where: { machineId: parsed.data.machineId },
    _max: { sortOrder: true },
  });
  const sortOrder =
    parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 10;

  const process = await prisma.machineProcess.create({
    data: {
      machineId: parsed.data.machineId,
      name,
      sortOrder,
      isActive: parsed.data.isActive ?? true,
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
