import { NextRequest, NextResponse } from "next/server";
import { PettyCashKind } from "@prisma/client";
import {
  requirePlantAccess,
  requireSession,
} from "@/lib/api";
import { resolveEntryApprovalFlags } from "@/lib/entry-approval";
import { dateRangeFromSearchParams } from "@/lib/api-date-range";
import { prisma } from "@/lib/db";
import { seesOwnEntriesOnly } from "@/lib/rbac";
import { paginate } from "@/lib/ui/paginate";
import {
  plantIdFilter,
  resolveCanonicalWritePlantId,
  resolveReportPlantIds,
} from "@/lib/plant-merge";
import { enrichExpenseElectricityReadings } from "@/lib/electricity-readings-enrich";
import type { PettyCashRouteContext } from "./schema";

export async function GET(
  request: NextRequest,
  context: PettyCashRouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const plantIds = await resolveReportPlantIds(plantId);
  const pScope = plantIdFilter(plantIds);
  const writePlantId = await resolveCanonicalWritePlantId(plantId);

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

  const ownOnly = seesOwnEntriesOnly(session.user.globalRole);
  const expenseHead = sp.get("expenseHead")?.trim() || null;
  const expenseHeads = (sp.get("expenseHeads") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const where = {
    ...pScope,
    ...(ownOnly ? { enteredById: session.user.id } : {}),
    ...filter,
    ...(entryType ? { entryType } : {}),
    ...(expenseHeads.length > 0
      ? { expenseHead: { in: expenseHeads } }
      : expenseHead
        ? { expenseHead }
        : {}),
  };
  const [entries, aggregate] = await Promise.all([
    prisma.pettyCashEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { enteredBy: { select: { globalRole: true } } },
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
  const enrichedSlice = await enrichExpenseElectricityReadings(
    writePlantId,
    slice,
  );
  const expenses = Number(aggregate._sum.amount ?? 0);
  const contractorSalary = Number(aggregate._sum.contractorSalary ?? 0);
  const supervisorSalary = Number(aggregate._sum.supervisorSalary ?? 0);

  const rowsWithStatus = enrichedSlice.map((entry) => ({
    ...entry,
    nature: entry.nature,
    location: entry.location,
    checkedBy: entry.checkedBy,
    approvedBy: entry.approvedBy,
    ...resolveEntryApprovalFlags(entry, entry.enteredBy?.globalRole ?? null),
  }));

  return NextResponse.json({
    rows: rowsWithStatus,
    ...pageInfo,
    totals: {
      expenses,
      contractorSalary,
      supervisorSalary,
      total: expenses + contractorSalary + supervisorSalary,
    },
  });
}
