import { NextRequest, NextResponse } from "next/server";
import {
  requireCanEnterExpense,
  requirePlantAccess,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { entryApprovalCreateData } from "@/lib/entry-approval";
import { safeRefreshDailyStatus } from "@/lib/daily-status";
import { maybeAwardCreditScore } from "@/lib/credit-score";
import { isBackdated, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import { resolveCanonicalWritePlantId } from "@/lib/plant-merge";
import { pettyCashSchema, type PettyCashRouteContext } from "./schema";

export async function POST(
  request: NextRequest,
  context: PettyCashRouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnterExpense(session.user.globalRole);
  if (enterDenied) return enterDenied;

  const { plantId } = await context.params;
  const denied = await requirePlantAccess(session.user.id, plantId);
  if (denied) return denied;

  const writePlantId = await resolveCanonicalWritePlantId(plantId);

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
  const approval = entryApprovalCreateData(session.user.globalRole, data.date);
  const approvalFields = {
    ...approval,
    ...(approval.approvedByHead ? { approvedByHeadId: session.user.id } : {}),
  };

  try {
    const entry = await prisma.pettyCashEntry.create({
    data: {
      plantId: writePlantId,
      date: parseDateOnly(data.date),
      shift: data.shift,
      entryType: data.entryType,
      payMode: data.payMode,
      expenseHead: data.expenseHead,
      nature: data.nature?.trim() || null,
      description: data.description ?? null,
      location: data.location?.trim() || null,
      checkedBy: data.checkedBy?.trim() || null,
      approvedBy: data.approvedBy?.trim() || null,
      openingReading:
        data.expenseHead === "Electricity" ||
        data.expenseHead === "Fuel & Power" ||
        data.expenseHead === "Unloading of MT" ||
        data.expenseHead === "Unloading MT"
          ? (data.openingReading ?? null)
          : null,
      closingReading:
        data.expenseHead === "Electricity" ||
        data.expenseHead === "Fuel & Power" ||
        data.expenseHead === "Unloading of MT" ||
        data.expenseHead === "Unloading MT"
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
      ...approvalFields,
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

    await safeRefreshDailyStatus(
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
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save expense entry";
    console.error("petty-cash POST failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
