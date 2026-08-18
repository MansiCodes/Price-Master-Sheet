import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { canAccessPlant, canEnterData } from "@/lib/rbac";
import { toIsoDateString } from "@/lib/dates";

type Ctx = { params: Promise<{ plantId: string }> };

const upsertSchema = z.object({
  month: z.string().min(7),
  openingReading: z.number().nullable().optional(),
  closingReading: z.number().nullable().optional(),
  consumedUnits: z.number().nullable().optional(),
  billAmount: z.number().nonnegative().optional(),
  rentAmount: z.number().nonnegative().optional(),
  coveredAreaSqft: z.number().nonnegative().nullable().optional(),
  rentRatePerSqft: z.number().nonnegative().nullable().optional(),
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

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { code: true },
  });
  const rows = await prisma.electricityRent.findMany({
    where: { plantId },
    orderBy: { month: "asc" },
  });

  return NextResponse.json({
    ok: true,
    plantCode: plant?.code ?? null,
    rows: rows.map((row) => ({
      ...row,
      month: toIsoDateString(row.month),
    })),
  });
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

  const existing = await prisma.electricityRent.findUnique({
    where: { plantId_month: { plantId, month } },
  });

  const toNum = (value: unknown): number | null => {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const coveredAreaSqft =
    parsed.data.coveredAreaSqft !== undefined
      ? parsed.data.coveredAreaSqft
      : toNum(existing?.coveredAreaSqft);
  const rentRatePerSqft =
    parsed.data.rentRatePerSqft !== undefined
      ? parsed.data.rentRatePerSqft
      : toNum(existing?.rentRatePerSqft);
  const computedRent =
    coveredAreaSqft != null && rentRatePerSqft != null
      ? Math.round(coveredAreaSqft * rentRatePerSqft * 100) / 100
      : parsed.data.rentAmount !== undefined
        ? parsed.data.rentAmount
        : toNum(existing?.rentAmount) ?? 0;

  const data = {
    openingReading:
      parsed.data.openingReading !== undefined
        ? parsed.data.openingReading
        : toNum(existing?.openingReading),
    closingReading:
      parsed.data.closingReading !== undefined
        ? parsed.data.closingReading
        : toNum(existing?.closingReading),
    consumedUnits:
      parsed.data.consumedUnits !== undefined
        ? parsed.data.consumedUnits
        : toNum(existing?.consumedUnits),
    billAmount:
      parsed.data.billAmount ?? toNum(existing?.billAmount) ?? 0,
    rentAmount: computedRent,
    coveredAreaSqft,
    rentRatePerSqft,
    notes:
      parsed.data.notes !== undefined ? parsed.data.notes : existing?.notes ?? null,
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
