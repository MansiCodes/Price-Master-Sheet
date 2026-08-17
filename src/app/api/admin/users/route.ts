import { NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac";

const indiaPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || (v.startsWith("91") && v.length === 12), {
    message: "Mobile number must be 10 digits",
  })
  .transform((v) => (v.length === 12 ? `+${v}` : `+91${v}`));

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional().nullable(),
  phone: indiaPhoneSchema,
  password: z.string().min(8).max(128),
  globalRole: z.enum(GlobalRole),
  canViewPriceSheet: z.boolean().optional().default(false),
  plantIds: z.array(z.string().min(1)).optional().default([]),
});

function requireSuperAdmin(
  session: { user?: { globalRole?: unknown; id?: string } } | null | undefined,
): NextResponse | null {
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.globalRole as Parameters<typeof isSuperAdmin>[0])) {
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
      phone: true,
      globalRole: true,
      creditScore: true,
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

  const phone = parsed.data.phone;
  const phoneTaken = await prisma.user.findFirst({
    where: { phone },
    select: { id: true },
  });
  if (phoneTaken) {
    return NextResponse.json(
      { ok: false, message: "Mobile number already registered" },
      { status: 409 },
    );
  }

  const role = parsed.data.globalRole;
  if (role === GlobalRole.SUPER_ADMIN) {
    const superCount = await prisma.user.count({
      where: { globalRole: GlobalRole.SUPER_ADMIN },
    });
    if (superCount > 0) {
      return NextResponse.json(
        { ok: false, message: "Only one Super Admin is allowed" },
        { status: 400 },
      );
    }
  }

  if (role !== GlobalRole.SUPER_ADMIN && plantIds.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Assign at least one plant for this user" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const canViewPriceSheet =
    role === GlobalRole.SUPER_ADMIN
      ? true
      : Boolean(parsed.data.canViewPriceSheet);

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name?.trim() || null,
      phone,
      passwordHash,
      globalRole: role,
      creditScore: role === GlobalRole.SUPER_ADMIN ? 100 : null,
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
      phone: true,
      globalRole: true,
      creditScore: true,
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
      phone: user.phone,
      globalRole: user.globalRole,
      plantIds,
      canViewPriceSheet: user.canViewPriceSheet,
    },
    actorId: session!.user!.id,
  });

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
