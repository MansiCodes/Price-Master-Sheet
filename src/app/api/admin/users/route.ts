import { NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  canManageUsers,
  canViewUsersDirectory,
  getPrimarySuperAdminEmail,
  isPrimarySuperAdmin,
} from "@/lib/rbac";

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
  canMachineSupervise: z.boolean().optional().default(false),
  canAdminMachineProduction: z.boolean().optional().default(false),
  canAccessStock: z.boolean().optional().default(false),
  canManageUsers: z.boolean().optional().default(false),
  plantIds: z.array(z.string().min(1)).optional().default([]),
});

type UsersActor = {
  id: string;
  email: string | null;
  globalRole: GlobalRole;
  canManageUsers: boolean;
};

async function loadUsersActor(
  session: { user?: { id?: string } } | null | undefined,
): Promise<
  { actor: UsersActor } | { error: NextResponse }
> {
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }),
    };
  }
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      globalRole: true,
      canManageUsers: true,
    },
  });
  if (!actor) {
    return {
      error: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }),
    };
  }
  return { actor };
}

function usersAccessOpts(actor: UsersActor) {
  return { canManageUsers: actor.canManageUsers };
}

export async function GET() {
  try {
    const session = await auth();
    const loaded = await loadUsersActor(session);
    if ("error" in loaded) return loaded.error;
    const { actor } = loaded;
    if (!canViewUsersDirectory(actor.globalRole, usersAccessOpts(actor))) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

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
        canMachineSupervise: true,
        canAdminMachineProduction: true,
        canAccessStock: true,
        canManageUsers: true,
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

    return NextResponse.json({
      ok: true,
      users,
      canManage: canManageUsers(actor.globalRole, usersAccessOpts(actor)),
      allowSuperAdmin: actor.globalRole === GlobalRole.SUPER_ADMIN,
      canManageSuperAdmins: isPrimarySuperAdmin(actor.email),
      primarySuperAdminEmail: getPrimarySuperAdminEmail(),
    });
  } catch (err) {
    console.error("GET /api/admin/users failed", err);
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error ? err.message : "Failed to load users",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const loaded = await loadUsersActor(session);
    if ("error" in loaded) return loaded.error;
    const { actor } = loaded;
    if (!canManageUsers(actor.globalRole, usersAccessOpts(actor))) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

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
  if (
    role === GlobalRole.SUPER_ADMIN &&
    actor.globalRole !== GlobalRole.SUPER_ADMIN
  ) {
    return NextResponse.json(
      { ok: false, message: "Only Super Admin can create Super Admin users" },
      { status: 403 },
    );
  }
  const needsPlants =
    role !== GlobalRole.SUPER_ADMIN &&
    role !== GlobalRole.MACHINE_SUPERVISOR;
  if (needsPlants && plantIds.length === 0) {
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
    const canMachineSupervise =
      role === GlobalRole.PLANT_MANAGER || role === GlobalRole.ACCOUNTANT
        ? Boolean(parsed.data.canMachineSupervise)
        : false;
    const canAdminMachineProduction =
      role === GlobalRole.SUPER_ADMIN
        ? true
        : Boolean(parsed.data.canAdminMachineProduction);
    const canAccessStock = Boolean(parsed.data.canAccessStock);
    const canManageUsersFlag =
      role === GlobalRole.SUPER_ADMIN
        ? false
        : Boolean(parsed.data.canManageUsers);

    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name?.trim() || null,
        phone,
        passwordHash,
        globalRole: role,
        creditScore: role === GlobalRole.SUPER_ADMIN ? 100 : null,
        canViewPriceSheet,
        canMachineSupervise,
        canAdminMachineProduction,
        canAccessStock,
        canManageUsers: canManageUsersFlag,
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
        canMachineSupervise: true,
        canAdminMachineProduction: true,
        canAccessStock: true,
        canManageUsers: true,
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
        canMachineSupervise: user.canMachineSupervise,
        canAdminMachineProduction: user.canAdminMachineProduction,
        canAccessStock: user.canAccessStock,
        canManageUsers: user.canManageUsers,
      },
      actorId: actor.id,
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/users POST]", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Failed to create user",
      },
      { status: 500 },
    );
  }
}
