import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { canAccessPlant, canEnterData } from "@/lib/rbac";

type Ctx = { params: Promise<{ plantId: string }> };

const upsertSchema = z.object({
  month: z.string().min(7),
  openingReading: z.number().nullable().optional(),
  closingReading: z.number().nullable().optional(),
  consumedUnits: z.number().nullable().optional(),
  billAmount: z.number().nonnegative().optional(),
  rentAmount: z.number().nonnegative().optional(),
  notes: z.string().max(500).nullable().optional(),
});

function parseMonth(input: string): Date | null {
  const m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(input.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

export async function GET(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { plantId } = await context.params;
  if (!(await canAccessPlant(session.user.id, plantId))) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.electricityRent.findMany({
    where: { plantId },
    orderBy: { month: "desc" },
  });

  return NextResponse.json({ ok: true, rows });
}

export async function POST(request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { plantId } = await context.params;
  if (!(await canAccessPlant(session.user.id, plantId))) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  if (!canEnterData(session.user.globalRole)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const month = parseMonth(parsed.data.month);
  if (!month) {
    return NextResponse.json(
      { ok: false, message: "month must be YYYY-MM" },
      { status: 400 },
    );
  }

  const data = {
    openingReading: parsed.data.openingReading ?? null,
    closingReading: parsed.data.closingReading ?? null,
    consumedUnits: parsed.data.consumedUnits ?? null,
    billAmount: parsed.data.billAmount ?? 0,
    rentAmount: parsed.data.rentAmount ?? 0,
    notes: parsed.data.notes ?? null,
  };

  const row = await prisma.electricityRent.upsert({
    where: { plantId_month: { plantId, month } },
    create: { plantId, month, ...data },
    update: data,
  });

  await writeAuditLog({
    entityType: "ElectricityRent",
    entityId: row.id,
    field: "upsert",
    newValue: { month: month.toISOString().slice(0, 10), ...data },
    actorId: session.user.id,
    plantId,
  });

  return NextResponse.json({ ok: true, row });
}
