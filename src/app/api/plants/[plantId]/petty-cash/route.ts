import { NextRequest, NextResponse } from "next/server";
import { ManpowerShift, PettyCashKind } from "@prisma/client";
import { z } from "zod";
import {
  requireCanEnter,
  requirePlantAccess,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { refreshDailyStatus } from "@/lib/daily-status";
import { maybeAwardCreditScore } from "@/lib/credit-score";
import { dateOnlyRegex, isBackdated, parseDateOnly } from "@/lib/dates";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { prisma } from "@/lib/db";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import { paginate } from "@/lib/ui/paginate";

const pettyCashSchema = z.object({
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift).default(ManpowerShift.DAY),
  entryType: z.enum(PettyCashKind).default(PettyCashKind.EXPENSE),
  payMode: z.string().min(1),
  expenseHead: z.string().min(1),
  description: z.string().optional().nullable(),
  openingReading: z.coerce.number().nonnegative().optional().nullable(),
  closingReading: z.coerce.number().nonnegative().optional().nullable(),
  billNumber: z.string().optional().nullable(),
  amount: z.coerce.number().nonnegative().default(0),
  contractorSalary: z.coerce.number().nonnegative().default(0),
  supervisorSalary: z.coerce.number().nonnegative().default(0),
  billPhotoUrl: z.string().url().optional().nullable(),
  billPhotoUrls: z.array(z.string().url()).max(3).optional(),
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

  const requestedType = sp.get("entryType");
  const entryType =
    requestedType && requestedType in PettyCashKind
      ? (requestedType as PettyCashKind)
      : null;

  const where = { plantId, ...filter, ...(entryType ? { entryType } : {}) };
  const [entries, aggregate] = await Promise.all([
    prisma.pettyCashEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.pettyCashEntry.aggregate({
      where,
      _sum: {
        amount: true,
        contractorSalary: true,
        supervisorSalary: true,
      },
    }),
  ]);

  const { slice, ...pageInfo } = paginate(entries, page, pageSize);
  const expenses = Number(aggregate._sum.amount ?? 0);
  const contractorSalary = Number(aggregate._sum.contractorSalary ?? 0);
  const supervisorSalary = Number(aggregate._sum.supervisorSalary ?? 0);

  return NextResponse.json({
    rows: slice,
    ...pageInfo,
    totals: {
      expenses,
      contractorSalary,
      supervisorSalary,
      total: expenses + contractorSalary + supervisorSalary,
    },
  });
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
  const photos = normalizeBillPhotoUrls(data.billPhotoUrls, data.billPhotoUrl);

  const entry = await prisma.pettyCashEntry.create({
    data: {
      plantId,
      date: parseDateOnly(data.date),
      shift: data.shift,
      entryType: data.entryType,
      payMode: data.payMode,
      expenseHead: data.expenseHead,
      description: data.description ?? null,
      openingReading:
        data.expenseHead === "Electricity"
          ? (data.openingReading ?? null)
          : null,
      closingReading:
        data.expenseHead === "Electricity"
          ? (data.closingReading ?? null)
          : null,
      billNumber: data.billNumber ?? null,
      amount: data.amount,
      contractorSalary: data.contractorSalary,
      supervisorSalary: data.supervisorSalary,
      billPhotoUrl: photos.billPhotoUrl,
      billPhotoUrls: photos.billPhotoUrls,
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

  await refreshDailyStatus(
    plantId,
    parseDateOnly(data.date),
    data.shift,
    session.user.id,
  );
  await maybeAwardCreditScore(
    session.user.id,
    plantId,
    parseDateOnly(data.date),
    data.shift,
  );

  return NextResponse.json({ entry }, { status: 201 });
}
