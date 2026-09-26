import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireCanEnter,
  requirePlantAccess,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { entryApprovalResetOnEdit } from "@/lib/entry-approval";
import { isBackdated, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import { lineTotals } from "./purchase-create-data";
import { purchaseSingleSchema, type RouteContext } from "./purchase-schemas";

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

  const parsed = purchaseSingleSchema
    .partial()
    .extend({ id: z.string().min(1) })
    .safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const existing = await prisma.purchase.findFirst({
    where: { id: data.id, plantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  const quantity = data.quantity ?? Number(existing.quantity);
  const rate = data.rate ?? Number(existing.rate);
  const gstPercent = data.gstPercent ?? Number(existing.gstPercent);
  const debitQuantity =
    data.debitQuantity ?? Number(existing.debitQuantity ?? 0);
  const totals = lineTotals(quantity, rate, gstPercent, debitQuantity);
  const dateStr = data.date ?? existing.date.toISOString().slice(0, 10);
  const approvalReset = entryApprovalResetOnEdit(
    session.user.globalRole,
    dateStr,
  );
  const photos =
    data.billPhotoUrls !== undefined || data.billPhotoUrl !== undefined
      ? normalizeBillPhotoUrls(data.billPhotoUrls, data.billPhotoUrl)
      : null;

  const purchase = await prisma.purchase.update({
    where: { id: existing.id },
    data: {
      date: data.date ? parseDateOnly(data.date) : undefined,
      type: data.type,
      typeOther: data.typeOther,
      vendorName: data.vendorName,
      billNumber: data.billNumber,
      billDate:
        data.billDate === undefined
          ? undefined
          : data.billDate
            ? parseDateOnly(data.billDate)
            : null,
      gstin: data.gstin,
      booksDate:
        data.booksDate === undefined
          ? undefined
          : data.booksDate
            ? parseDateOnly(data.booksDate)
            : null,
      notes: data.notes,
      itemDescription: data.itemDescription,
      unit: data.unit,
      quantity: data.quantity,
      debitQuantity: data.debitQuantity,
      rate: data.rate,
      gstPercent: totals.gstPercent,
      basicValue: totals.basicValue,
      gstAmount: totals.gstAmount,
      invoiceValue: totals.invoiceValue,
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
    entityType: "Purchase",
    entityId: purchase.id,
    field: "update",
    oldValue: existing,
    newValue: purchase,
    actorId: session.user.id,
    plantId,
    isBackdated: purchase.isBackdated,
  });

  return NextResponse.json({ purchase });
}
