import { NextRequest, NextResponse } from "next/server";
import {
  requireCanEnterStock,
  requirePlantAccess,
  requireSession,
  zodErrorResponse,
} from "@/lib/api";
import { safeWriteAuditLog } from "@/lib/audit";
import { entryApprovalCreateData } from "@/lib/entry-approval";
import { safeRefreshDailyStatus } from "@/lib/daily-status";
import { maybeAwardCreditScore } from "@/lib/credit-score";
import { isBackdated, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import {
  resolveCanonicalWritePlantId,
  resolveReportPlantIds,
} from "@/lib/plant-merge";
import { applyQuadSignalOpeningLockToNotes } from "@/lib/quad-signal-opening";
import { canAlwaysEditQuadOpeningStock } from "@/lib/rbac";
import { resolveStockLineAmounts, stockEntryCreateData } from "./stock-amounts";
import { stockBatchSchema, stockSingleSchema, type RouteContext } from "./stock-schemas";

export async function POST(
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

  const writePlantId = await resolveCanonicalWritePlantId(plantId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const isBatch =
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { entries?: unknown }).entries);

  try {
    if (isBatch) {
      const parsed = stockBatchSchema.safeParse(body);
      if (!parsed.success) return zodErrorResponse(parsed.error);

      const data = parsed.data;
      const backdated = isBackdated(data.date);
      const day = parseDateOnly(data.date);
      const photos = normalizeBillPhotoUrls(data.photoUrls, data.photoUrl);
      const approval = entryApprovalCreateData(
        session.user.globalRole,
        data.date,
      );
      const approvalFields = {
        ...approval,
        ...(approval.approvedByHead
          ? { approvedByHeadId: session.user.id }
          : {}),
      };

      const plantIds = await resolveReportPlantIds(plantId);
      const allowOpeningOverride = canAlwaysEditQuadOpeningStock(
        session.user.email,
      );
      const resolved = await Promise.all(
        data.entries.map(async (line) => {
          const lockedNotes = await applyQuadSignalOpeningLockToNotes({
            plantIds,
            day,
            notes: line.notes,
            allowOpeningOverride,
          });
          return {
            line: { ...line, notes: lockedNotes ?? line.notes },
            amounts: await resolveStockLineAmounts(
              writePlantId,
              day,
              line.quantity,
              line.rate,
              line.value,
              line.itemName,
            ),
          };
        }),
      );

      const created = await prisma.$transaction(async (tx) => {
        const entries = [];
        for (const { line, amounts } of resolved) {
          entries.push(
            await tx.stockEntry.create({
              data: stockEntryCreateData(
                writePlantId,
                session.user.id,
                data,
                line,
                amounts,
                photos,
                approvalFields,
                backdated,
                day,
              ),
            }),
          );
        }
        return entries;
      });

      await safeWriteAuditLog({
        entityType: "StockEntry",
        entityId: created[0]!.id,
        field: "create",
        newValue: {
          itemCount: created.length,
          items: created.map((entry) => entry.itemName),
          closingValue: created.reduce(
            (sum, entry) => sum + Number(entry.closingValue),
            0,
          ),
        },
        actorId: session.user.id,
        plantId,
        isBackdated: backdated,
      });

      await safeRefreshDailyStatus(plantId, day, data.shift, session.user.id);
      await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

      return NextResponse.json({ entries: created }, { status: 201 });
    }

    const parsed = stockSingleSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const data = parsed.data;
    const backdated = isBackdated(data.date);
    const day = parseDateOnly(data.date);
    const plantIds = await resolveReportPlantIds(plantId);
    const lockedNotes = await applyQuadSignalOpeningLockToNotes({
      plantIds,
      day,
      notes: data.notes,
      allowOpeningOverride: canAlwaysEditQuadOpeningStock(session.user.email),
    });
    const dataWithNotes = { ...data, notes: lockedNotes ?? data.notes };
    const photos = normalizeBillPhotoUrls(data.photoUrls, data.photoUrl);
    const amounts = await resolveStockLineAmounts(
      writePlantId,
      day,
      data.quantity,
      data.rate,
      data.value,
      data.itemName,
    );
    const approval = entryApprovalCreateData(session.user.globalRole, data.date);
    const approvalFields = {
      ...approval,
      ...(approval.approvedByHead ? { approvedByHeadId: session.user.id } : {}),
    };

    const entry = await prisma.stockEntry.create({
      data: stockEntryCreateData(
        writePlantId,
        session.user.id,
        dataWithNotes,
        dataWithNotes,
        amounts,
        photos,
        approvalFields,
        backdated,
        day,
      ),
    });

    await safeWriteAuditLog({
      entityType: "StockEntry",
      entityId: entry.id,
      field: "create",
      newValue: {
        itemName: entry.itemName,
        quantity: Number(entry.quantity),
        rate: Number(entry.rate),
        closingValue: Number(entry.closingValue),
      },
      actorId: session.user.id,
      plantId,
      isBackdated: backdated,
    });

    await safeRefreshDailyStatus(plantId, day, data.shift, session.user.id);
    await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save stock entry";
    console.error("stock POST failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
