import { NextRequest, NextResponse } from "next/server";
import { ManpowerRole, ManpowerShift } from "@prisma/client";
import { z } from "zod";
import {
  requireCanEnter,
  requireDeleteConfirmation,
  requirePlantAccess,
  requireSession,
  round2,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { refreshDailyStatus } from "@/lib/daily-status";
import { maybeAwardCreditScore } from "@/lib/credit-score";
import { dateOnlyRegex, isBackdated, parseDateOnly } from "@/lib/dates";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { prisma } from "@/lib/db";
import { paginate } from "@/lib/ui/paginate";

const DEFAULT_RATES: Record<ManpowerRole, number> = {
  MANAGER: 4000,
  OPERATOR: 1500,
  HELPER: 800,
};

const productionSchema = z.object({
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift),
  productName: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  notes: z.string().optional().nullable(),
  manpower: z
    .object({
      manager: z.coerce.number().int().nonnegative(),
      operator: z.coerce.number().int().nonnegative(),
      helper: z.coerce.number().int().nonnegative(),
    })
    .optional()
    .default({ manager: 0, operator: 0, helper: 0 }),
});

type RouteContext = { params: Promise<{ plantId: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const { filter, error } = dateRangeFromSearchParams(sp);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  const page = Number(sp.get("page")) || 1;
  const pageSize = Number(sp.get("pageSize")) || 10;

  const entries = await prisma.productionEntry.findMany({
    where: { plantId, ...filter },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const { slice, ...pageInfo } = paginate(entries, page, pageSize);
  const totals = entries.reduce(
    (acc, row) => {
      acc.quantity += Number(row.quantity) || 0;
      return acc;
    },
    { quantity: 0 },
  );

  return NextResponse.json({ rows: slice, ...pageInfo, totals });
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnter(session.user.globalRole);
  if (enterDenied) return enterDenied;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = productionSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const backdated = isBackdated(data.date);
  const day = parseDateOnly(data.date);

  const rateSettings = await prisma.manpowerRateSetting.findMany({
    where: { plantId },
  });
  const rateByRole = new Map(
    rateSettings.map((s) => [s.role, Number(s.ratePerDay)]),
  );

  const roleHeadcounts: Array<{ role: ManpowerRole; headcount: number }> = [
    { role: ManpowerRole.MANAGER, headcount: data.manpower.manager },
    { role: ManpowerRole.OPERATOR, headcount: data.manpower.operator },
    { role: ManpowerRole.HELPER, headcount: data.manpower.helper },
  ].filter((r) => r.headcount > 0);

  const { production, manpowerEntries } = await prisma.$transaction(
    async (tx) => {
      const production = await tx.productionEntry.create({
        data: {
          plantId,
          date: day,
          shift: data.shift,
          productName: data.productName,
          quantity: data.quantity,
          unit: data.unit,
          notes: data.notes ?? null,
          enteredById: session.user.id,
          isBackdated: backdated,
        },
      });

      const manpowerEntries = await Promise.all(
        roleHeadcounts.map(({ role, headcount }) => {
          const ratePerDay = rateByRole.get(role) ?? DEFAULT_RATES[role];
          const totalCost = round2(headcount * ratePerDay);
          return tx.manpowerEntry.create({
            data: {
              plantId,
              date: day,
              shift: data.shift,
              role,
              headcount,
              ratePerDay,
              totalCost,
              enteredById: session.user.id,
              isBackdated: backdated,
            },
          });
        }),
      );

      return { production, manpowerEntries };
    },
  );

  await writeAuditLog({
    entityType: "ProductionEntry",
    entityId: production.id,
    field: "create",
    newValue: {
      productName: production.productName,
      quantity: Number(production.quantity),
      unit: production.unit,
      shift: production.shift,
      manpower: {
        manager: data.manpower.manager,
        operator: data.manpower.operator,
        helper: data.manpower.helper,
        totalCost: manpowerEntries.reduce(
          (sum, entry) => sum + Number(entry.totalCost),
          0,
        ),
      },
    },
    actorId: session.user.id,
    plantId,
    isBackdated: backdated,
  });

  await refreshDailyStatus(plantId, day, data.shift, session.user.id);
  await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

  return NextResponse.json({ production, manpowerEntries }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnter(session.user.globalRole);
  if (enterDenied) return enterDenied;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = productionSchema
    .omit({ manpower: true })
    .partial()
    .extend({ id: z.string().min(1) })
    .safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const existing = await prisma.productionEntry.findFirst({
    where: { id: data.id, plantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Production entry not found" }, { status: 404 });
  }

  const dateStr = data.date ?? existing.date.toISOString().slice(0, 10);

  const production = await prisma.productionEntry.update({
    where: { id: existing.id },
    data: {
      date: data.date ? parseDateOnly(data.date) : undefined,
      shift: data.shift,
      productName: data.productName,
      quantity: data.quantity,
      unit: data.unit,
      notes: data.notes,
      isBackdated: isBackdated(dateStr),
    },
  });

  await writeAuditLog({
    entityType: "ProductionEntry",
    entityId: production.id,
    field: "update",
    oldValue: existing,
    newValue: production,
    actorId: session.user.id,
    plantId,
    isBackdated: production.isBackdated,
  });

  return NextResponse.json({ production });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnter(session.user.globalRole);
  if (enterDenied) return enterDenied;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const unconfirmed = await requireDeleteConfirmation(request);
  if (unconfirmed) return unconfirmed;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const existing = await prisma.productionEntry.findFirst({
    where: { id, plantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Production entry not found" }, { status: 404 });
  }

  await prisma.productionEntry.delete({ where: { id } });
  await writeAuditLog({
    entityType: "ProductionEntry",
    entityId: id,
    field: "delete",
    oldValue: { id },
    actorId: session.user.id,
    plantId,
  });

  return NextResponse.json({ ok: true });
}
