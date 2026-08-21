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
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user.globalRole);
  if (denied) return denied;

  const all = request.nextUrl.searchParams.get("all") === "1";
  const isAdmin = session.user.globalRole === "SUPER_ADMIN";

  const types = await prisma.machineCableType.findMany({
    where: all && isAdmin ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    types: types.map((t) => ({
      id: t.id,
      name: t.name,
      sortOrder: t.sortOrder,
      isActive: t.isActive,
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

  const name = parsed.data.name;
  const existing = await prisma.machineCableType.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "That cable type already exists" },
      { status: 409 },
    );
  }

  const maxSort = await prisma.machineCableType.aggregate({
    _max: { sortOrder: true },
  });
  const sortOrder =
    parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 10;

  const type = await prisma.machineCableType.create({
    data: {
      name,
      sortOrder,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({
    ok: true,
    type: {
      id: type.id,
      name: type.name,
      sortOrder: type.sortOrder,
      isActive: type.isActive,
    },
  });
}
