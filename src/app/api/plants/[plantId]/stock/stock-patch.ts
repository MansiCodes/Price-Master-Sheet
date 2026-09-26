import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireCanEnterStock,
  requirePlantAccess,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { entryApprovalResetOnEdit } from "@/lib/entry-approval";
import { isBackdated, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { parseQuadSignalStockNotes } from "@/lib/plant-catalogs";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import { resolveReportPlantIds } from "@/lib/plant-merge";
import { applyQuadSignalOpeningLockToNotes } from "@/lib/quad-signal-opening";
import { canAlwaysEditQuadOpeningStock } from "@/lib/rbac";
import { lineAmounts } from "./stock-amounts";
import { stockSingleSchema, type RouteContext } from "./stock-schemas";

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnterStock(session.user.globalRole);
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

  const parsed = stockSingleSchema
    .partial()
    .extend({ id: z.string().min(1) })
    .safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const existing = await prisma.stockEntry.findFirst({
    where: { id: data.id, plantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Stock entry not found" }, { status: 404 });
  }

  const quantity = data.quantity ?? Number(existing.quantity);
  const rate = data.rate ?? Number(existing.rate);
  const value = data.value ?? Number(existing.closingValue);
  const amounts = lineAmounts(quantity, data.rate ?? rate, data.value ?? value);
  const dateStr = data.date ?? existing.date.toISOString().slice(0, 10);
  const approvalReset = entryApprovalResetOnEdit(
    session.user.globalRole,
    dateStr,
  );
  const photos =
    data.photoUrls !== undefined || data.photoUrl !== undefined
      ? normalizeBillPhotoUrls(data.photoUrls, data.photoUrl)
      : null;

  const plantIds = await resolveReportPlantIds(plantId);
  const allowOpeningOverride = canAlwaysEditQuadOpeningStock(
    session.user.email,
  );
  const existingOpening =
    parseQuadSignalStockNotes(existing.notes).meta?.opening ?? {};
  const lockedNotes =
    data.notes !== undefined
      ? await applyQuadSignalOpeningLockToNotes({
          plantIds,
          day: parseDateOnly(dateStr),
          notes: data.notes,
          allowOpeningOverride,
          lockOpeningTo: allowOpeningOverride ? undefined : existingOpening,
        })
      : undefined;

  const entry = await prisma.stockEntry.update({
    where: { id: existing.id },
    data: {
      date: data.date ? parseDateOnly(data.date) : undefined,
      itemName: data.itemName,
      category: data.category,
      unit: data.unit,
      quantity: amounts.quantity,
      rate: amounts.rate,
      closingValue: amounts.closingValue,
      notes: lockedNotes !== undefined ? lockedNotes : data.notes,
      ...(photos
        ? {
            photoUrl: photos.billPhotoUrl,
            photoUrls: photos.billPhotoUrls,
          }
        : {}),
      isBackdated: isBackdated(dateStr),
      ...approvalReset,
    },
  });

  await writeAuditLog({
    entityType: "StockEntry",
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
