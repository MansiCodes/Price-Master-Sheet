import { NextRequest, NextResponse } from "next/server";
import { ManpowerRole, ManpowerShift } from "@prisma/client";
import { z } from "zod";
import {
  requireCanEnter,
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

  return NextResponse.json({ rows: slice, ...pageInfo });
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
