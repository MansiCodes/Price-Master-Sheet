import { NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac";

type RouteContext = { params: Promise<{ userId: string }> };

const indiaPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || (v.startsWith("91") && v.length === 12), {
    message: "Mobile number must be 10 digits",
  })
  .transform((v) => (v.length === 12 ? `+${v}` : `+91${v}`));

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional().nullable(),
  phone: indiaPhoneSchema.optional(),
  globalRole: z.enum(GlobalRole).optional(),
  canViewPriceSheet: z.boolean().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
  plantIds: z.array(z.string().min(1)).optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.globalRole)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { plantRoles: true },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
  }

  if (existing.globalRole === GlobalRole.SUPER_ADMIN && parsed.data.isActive === false) {
    return NextResponse.json(
      { ok: false, message: "A Super Admin cannot be deactivated" },
      { status: 400 },
    );
  }
  if (
    existing.id === session.user.id &&
    parsed.data.globalRole &&
    parsed.data.globalRole !== GlobalRole.SUPER_ADMIN
  ) {
    return NextResponse.json(
      { ok: false, message: "You cannot remove your own Super Admin role" },
      { status: 400 },
    );
  }
  if (
    parsed.data.globalRole === GlobalRole.SUPER_ADMIN &&
    existing.globalRole !== GlobalRole.SUPER_ADMIN
  ) {
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

  const data = parsed.data;
  if (data.phone) {
    const phoneTaken = await prisma.user.findFirst({
      where: { phone: data.phone, NOT: { id: userId } },
      select: { id: true },
    });
    if (phoneTaken) {
      return NextResponse.json(
        { ok: false, message: "Mobile number already registered" },
        { status: 409 },
      );
    }
  }
  if (data.plantIds) {
    const plantIds = [...new Set(data.plantIds)];
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
  }

  const nextRole = data.globalRole ?? existing.globalRole;
  const passwordHash = data.password
    ? await bcrypt.hash(data.password, 12)
    : undefined;
  const nextCreditScore =
    nextRole === GlobalRole.SUPER_ADMIN ? 100 : null;

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name?.trim() || null } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.globalRole ? { globalRole: data.globalRole } : {}),
        ...(data.canViewPriceSheet !== undefined
          ? {
              canViewPriceSheet:
                nextRole === GlobalRole.SUPER_ADMIN
                  ? true
                  : data.canViewPriceSheet,
            }
          : nextRole === GlobalRole.SUPER_ADMIN
            ? { canViewPriceSheet: true }
            : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        // For now it is prefilled only for SUPER_ADMIN.
        creditScore: nextCreditScore,
        ...(passwordHash ? { passwordHash } : {}),
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

    if (data.plantIds) {
      const plantIds = [...new Set(data.plantIds)];
      await tx.userPlantRole.deleteMany({ where: { userId } });
      if (plantIds.length > 0) {
        await tx.userPlantRole.createMany({
          data: plantIds.map((plantId) => ({
            userId,
            plantId,
            role: nextRole,
          })),
        });
      }
    }

    return user;
  });

  await writeAuditLog({
    entityType: "User",
    entityId: userId,
    field: "update",
    oldValue: {
      globalRole: existing.globalRole,
      canViewPriceSheet: existing.canViewPriceSheet,
      isActive: existing.isActive,
      plantIds: existing.plantRoles.map((p) => p.plantId),
    },
    newValue: {
      ...updated,
      plantIds: data.plantIds,
      passwordChanged: Boolean(data.password),
    },
    actorId: session.user.id,
  });

  return NextResponse.json({ ok: true, user: updated });
}
