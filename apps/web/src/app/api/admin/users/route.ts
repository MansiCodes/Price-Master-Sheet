import { NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional().nullable(),
  password: z.string().min(8).max(128),
  globalRole: z.enum(GlobalRole),
  canViewPriceSheet: z.boolean().optional().default(false),
  plantIds: z.array(z.string().min(1)).optional().default([]),
});

function requireSuperAdmin(
  session: Awaited<ReturnType<typeof auth>>,
): NextResponse | null {
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.globalRole)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const session = await auth();
  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      globalRole: true,
      canViewPriceSheet: true,
      isActive: true,
      coinsBalance: true,
      createdAt: true,
      plantRoles: {
        select: {
          plantId: true,
          role: true,
          plant: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, users });
}

export async function POST(request: Request) {
  const session = await auth();
  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const plantIds = [...new Set(parsed.data.plantIds)];

  if (plantIds.length > 0) {
    const count = await prisma.plant.count({
      where: { id: { in: plantIds }, isActive: true },
    });
    if (count !== plantIds.length) {
      return NextResponse.json(
        { ok: false, message: "One or more plants are invalid" },
        { status: 400 },
      );
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { ok: false, message: "Email already registered" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const role = parsed.data.globalRole;
  const canViewPriceSheet =
    role === GlobalRole.SUPER_ADMIN
      ? true
      : Boolean(parsed.data.canViewPriceSheet);

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name?.trim() || null,
      passwordHash,
      globalRole: role,
      canViewPriceSheet,
      isActive: true,
      plantRoles: {
        create: plantIds.map((plantId) => ({
          plantId,
          role,
        })),
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      globalRole: true,
      canViewPriceSheet: true,
      isActive: true,
    },
  });

  await writeAuditLog({
    entityType: "User",
    entityId: user.id,
    field: "create",
    newValue: {
      email: user.email,
      globalRole: user.globalRole,
      plantIds,
      canViewPriceSheet: user.canViewPriceSheet,
    },
    actorId: session!.user!.id,
  });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
