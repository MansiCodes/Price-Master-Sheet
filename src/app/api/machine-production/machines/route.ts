import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireMachineProductionAdmin,
  requireMachineProductionAccess,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Code must be alphanumeric")
    .optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

function slugCodeFromName(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return base || "MACHINE";
}

async function allocateUniqueCode(name: string): Promise<string> {
  const base = slugCodeFromName(name);
  for (let i = 0; i < 50; i++) {
    const code = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await prisma.machine.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

export async function GET() {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user);
  if (denied) return denied;

  const isAdmin = session.user.globalRole === "SUPER_ADMIN";
  const machines = await prisma.machine.findMany({
    where: isAdmin ? undefined : { isActive: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    machines: machines.map((m) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      description: m.description,
      isActive: m.isActive,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
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

  const code = parsed.data.code
    ? parsed.data.code.toUpperCase()
    : await allocateUniqueCode(parsed.data.name);

  if (parsed.data.code) {
    const existing = await prisma.machine.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: `Machine code ${code} already exists` },
        { status: 409 },
      );
    }
  }

  const machine = await prisma.machine.create({
    data: {
      name: parsed.data.name,
      code,
      description: parsed.data.description || null,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({
    ok: true,
    machine: {
      id: machine.id,
      name: machine.name,
      code: machine.code,
      description: machine.description,
      isActive: machine.isActive,
      createdAt: machine.createdAt.toISOString(),
      updatedAt: machine.updatedAt.toISOString(),
    },
  });
}
