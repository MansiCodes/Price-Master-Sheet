import { NextResponse } from "next/server";
import { z } from "zod";
import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/rbac";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  code: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "code must be alphanumeric"),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.globalRole !== GlobalRole.SUPER_ADMIN &&
      session.user.globalRole !== GlobalRole.BUSINESS_HEAD
    ) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const plants = await prisma.plant.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, plants });
  } catch (error) {
    console.error("[api/admin/plants GET]", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Failed to load plants",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!isSuperAdmin(session.user.globalRole)) {
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
      { ok: false, message: "Invalid plant payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const name = parsed.data.name.trim();
  const code = parsed.data.code.trim().toUpperCase();

  try {
    const plant = await prisma.plant.create({
      data: {
        name,
        code,
        isActive: parsed.data.isActive ?? true,
      },
    });

    await writeAuditLog({
      entityType: "Plant",
      entityId: plant.id,
      field: "create",
      newValue: { name: plant.name, code: plant.code },
      actorId: session.user.id,
      plantId: plant.id,
    });

    return NextResponse.json({ ok: true, plant }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && /unique/i.test(error.message)
        ? "Plant name or code already exists"
        : "Failed to create plant";
    return NextResponse.json({ ok: false, message }, { status: 409 });
  }
}
