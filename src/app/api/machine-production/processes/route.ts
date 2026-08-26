import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  requireMachineProductionAccess,
  requireMachineProductionAdmin,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  machineIds: z.array(z.string().min(1)).optional(),
});

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user);
  if (denied) return denied;

  const all = request.nextUrl.searchParams.get("all") === "1";
  const isAdmin = session.user.globalRole === "SUPER_ADMIN";

  const processes = await prisma.productionProcess.findMany({
    where: all && isAdmin ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      machines: {
        orderBy: [{ sortOrder: "asc" }],
        include: {
          machine: {
            select: { id: true, name: true, code: true, isActive: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    processes: processes.map((p) => {
      // Supervisors only ever act on active machines; admin needs the full set.
      const links = isAdmin
        ? p.machines
        : p.machines.filter((link) => link.machine.isActive);
      return {
        id: p.id,
        name: p.name,
        sortOrder: p.sortOrder,
        isActive: p.isActive,
        machineCount: links.length,
        machineIds: links.map((link) => link.machineId),
        machines: links.map((link) => ({
          id: link.machine.id,
          name: link.machine.name,
          code: link.machine.code,
          isActive: link.machine.isActive,
        })),
      };
    }),
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

  const name = parsed.data.name;
  const existing = await prisma.productionProcess.findUnique({
    where: { name },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A process with that name already exists" },
      { status: 409 },
    );
  }

  const machineIds = [...new Set(parsed.data.machineIds ?? [])];
  if (machineIds.length > 0) {
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

  const maxSort = await prisma.productionProcess.aggregate({
    _max: { sortOrder: true },
  });
  const sortOrder = parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 10;

  const process = await prisma.productionProcess.create({
    data: {
      name,
      sortOrder,
      isActive: parsed.data.isActive ?? true,
      machines: {
        create: machineIds.map((machineId, i) => ({
          machineId,
          sortOrder: i * 10,
        })),
      },
    },
    include: { machines: true },
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

const reorderSchema = z.object({
  /** Full list of process ids in the order they should appear. */
  order: z.array(z.string().min(1)).min(1),
});

/**
 * Collection-level reorder. Rewrites sortOrder for every id in a single
 * UPDATE ... FROM (VALUES ...) so the supervisor board and Admin list can never
 * disagree about the order.
 *
 * One statement, not one per row: a per-row transaction meant ~34 sequential
 * round trips to Neon, which overran Prisma's 5s transaction budget (P2028).
 */
export async function PATCH(request: Request) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAdmin(session.user.globalRole);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const order = [...new Set(parsed.data.order)];
  const found = await prisma.productionProcess.count({
    where: { id: { in: order } },
  });
  if (found !== order.length) {
    return NextResponse.json(
      { error: "One or more processes no longer exist" },
      { status: 400 },
    );
  }

  const values = Prisma.join(
    order.map((id, i) => Prisma.sql`(${id}::text, ${(i + 1) * 10}::int)`),
  );
  await prisma.$executeRaw`
    UPDATE "ProductionProcess" AS p
       SET "sortOrder" = v.ord,
           "updatedAt" = NOW()
      FROM (VALUES ${values}) AS v(id, ord)
     WHERE p.id = v.id
  `;

  return NextResponse.json({ ok: true, count: order.length });
}
