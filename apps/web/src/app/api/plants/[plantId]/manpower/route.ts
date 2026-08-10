import { NextRequest, NextResponse } from "next/server";
import { ManpowerRole, ManpowerShift } from "@prisma/client";
import { z } from "zod";
import {
  jsonError,
  requireCanEnter,
  requirePlantAccess,
  requireSession,
  round2,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { refreshDailyStatus } from "@/lib/daily-status";
import { dateOnlyRegex, isBackdated, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { paginate } from "@/lib/ui/paginate";

const manpowerSchema = z.object({
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift),
  role: z.enum(ManpowerRole),
  headcount: z.coerce.number().int().positive(),
  ratePerDay: z.coerce.number().nonnegative().optional().nullable(),
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
  const dateStr = sp.get("date");
  if (dateStr && !dateOnlyRegex.test(dateStr)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const page = Number(sp.get("page")) || 1;
  const pageSize = Number(sp.get("pageSize")) || 10;

  const entries = await prisma.manpowerEntry.findMany({
    where: { plantId, ...(dateStr ? { date: parseDateOnly(dateStr) } : {}) },
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

  const parsed = manpowerSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  let ratePerDay = data.ratePerDay ?? null;

  if (ratePerDay == null) {
    const setting = await prisma.manpowerRateSetting.findUnique({
      where: {
        plantId_role: { plantId, role: data.role },
      },
    });
    if (!setting) {
      return jsonError(
        `No manpower rate set for role ${data.role}. Provide ratePerDay.`,
        400,
      );
    }
    ratePerDay = Number(setting.ratePerDay);
  }

  const totalCost = round2(data.headcount * ratePerDay);
  const backdated = isBackdated(data.date);

  const entry = await prisma.manpowerEntry.create({
    data: {
      plantId,
      date: parseDateOnly(data.date),
      shift: data.shift,
      role: data.role,
      headcount: data.headcount,
      ratePerDay,
      totalCost,
      enteredById: session.user.id,
      isBackdated: backdated,
    },
  });

  await writeAuditLog({
    entityType: "ManpowerEntry",
    entityId: entry.id,
    field: "create",
    newValue: entry,
    actorId: session.user.id,
    plantId,
    isBackdated: backdated,
  });

  await refreshDailyStatus(plantId, parseDateOnly(data.date), session.user.id);

  return NextResponse.json({ entry }, { status: 201 });
}
