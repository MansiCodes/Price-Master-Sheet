import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireCanEnter,
  requirePlantAccess,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { refreshDailyStatus } from "@/lib/daily-status";
import { dateOnlyRegex, isBackdated, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { paginate } from "@/lib/ui/paginate";

const pettyCashSchema = z.object({
  date: z.string().regex(dateOnlyRegex),
  payMode: z.string().min(1),
  expenseHead: z.string().min(1),
  description: z.string().optional().nullable(),
  billNumber: z.string().optional().nullable(),
  amount: z.coerce.number().nonnegative().default(0),
  contractorSalary: z.coerce.number().nonnegative().default(0),
  supervisorSalary: z.coerce.number().nonnegative().default(0),
  billPhotoUrl: z.string().optional().nullable(),
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

  const entries = await prisma.pettyCashEntry.findMany({
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

  const parsed = pettyCashSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const backdated = isBackdated(data.date);

  const entry = await prisma.pettyCashEntry.create({
    data: {
      plantId,
      date: parseDateOnly(data.date),
      payMode: data.payMode,
      expenseHead: data.expenseHead,
      description: data.description ?? null,
      billNumber: data.billNumber ?? null,
      amount: data.amount,
      contractorSalary: data.contractorSalary,
      supervisorSalary: data.supervisorSalary,
      billPhotoUrl: data.billPhotoUrl ?? null,
      enteredById: session.user.id,
      isBackdated: backdated,
    },
  });

  await writeAuditLog({
    entityType: "PettyCashEntry",
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
