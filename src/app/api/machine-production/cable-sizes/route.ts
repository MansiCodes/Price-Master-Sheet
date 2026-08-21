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

  const sizes = await prisma.machineCableSize.findMany({
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

  const denied = requireMachineProductionAdmin(session.user.globalRole);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const cableType = await prisma.machineCableType.findUnique({
    where: { id: parsed.data.cableTypeId },
  });
  if (!cableType) {
    return NextResponse.json({ error: "Cable type not found" }, { status: 404 });
  }

  const name = parsed.data.name;
  const existing = await prisma.machineCableSize.findUnique({
    where: {
      cableTypeId_name: {
        cableTypeId: parsed.data.cableTypeId,
        name,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "That size already exists for this cable type" },
      { status: 409 },
    );
  }

  const maxSort = await prisma.machineCableSize.aggregate({
    where: { cableTypeId: parsed.data.cableTypeId },
    _max: { sortOrder: true },
  });
  const sortOrder =
    parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 10;

  const size = await prisma.machineCableSize.create({
    data: {
      cableTypeId: parsed.data.cableTypeId,
      name,
      sortOrder,
      isActive: parsed.data.isActive ?? true,
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
