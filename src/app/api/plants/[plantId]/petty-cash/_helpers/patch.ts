import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireCanEnterExpense,
  requirePlantAccess,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { entryApprovalResetOnEdit } from "@/lib/entry-approval";
import { isBackdated, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import { pettyCashSchema, type PettyCashRouteContext } from "./schema";

export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = pettyCashSchema
    .partial()
    .extend({ id: z.string().min(1) })
    .safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const existing = await prisma.pettyCashEntry.findFirst({
    where: { id: data.id, plantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const dateStr = data.date ?? existing.date.toISOString().slice(0, 10);
  const approvalReset = entryApprovalResetOnEdit(
    session.user.globalRole,
    dateStr,
  );
  const photos =
    data.billPhotoUrls !== undefined || data.billPhotoUrl !== undefined
      ? normalizeBillPhotoUrls(data.billPhotoUrls, data.billPhotoUrl)
      : null;

  const entry = await prisma.pettyCashEntry.update({
    where: { id: existing.id },
    data: {
      date: data.date ? parseDateOnly(data.date) : undefined,
      entryType: data.entryType,
      payMode: data.payMode,
      expenseHead: data.expenseHead,
      nature: data.nature,
      description: data.description,
      location: data.location,
      checkedBy: data.checkedBy,
      approvedBy: data.approvedBy,
      openingReading: data.openingReading,
      closingReading: data.closingReading,
      billNumber: data.billNumber,
      amount: data.amount,
      contractorSalary: data.contractorSalary,
      supervisorSalary: data.supervisorSalary,
      ...(photos
        ? {
            billPhotoUrl: photos.billPhotoUrl,
            billPhotoUrls: photos.billPhotoUrls,
          }
        : {}),
      isBackdated: isBackdated(dateStr),
      ...approvalReset,
    },
  });

  await writeAuditLog({
    entityType: "PettyCashEntry",
    entityId: entry.id,
    field: "update",
    oldValue: existing,
    newValue: entry,
    actorId: session.user.id,
    plantId,
    isBackdated: entry.isBackdated,
  });

  return NextResponse.json({ entry });
}
