import { NextRequest, NextResponse } from "next/server";
import {
  requireCanEnter,
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
import { resolveCanonicalWritePlantId } from "@/lib/plant-merge";
import { purchaseCreateData } from "./purchase-create-data";
import {
  purchaseBatchSchema,
  purchaseSingleSchema,
  type RouteContext,
} from "./purchase-schemas";

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
    Array.isArray((body as { items?: unknown }).items);

  try {
    if (isBatch) {
      const parsed = purchaseBatchSchema.safeParse(body);
      if (!parsed.success) return zodErrorResponse(parsed.error);

      const data = parsed.data;
      const backdated = isBackdated(data.date);
      const day = parseDateOnly(data.date);
      const headerGst = data.gstPercent ?? 0;
      const photos = normalizeBillPhotoUrls(
        data.billPhotoUrls,
        data.billPhotoUrl,
      );

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

      const purchases = await prisma.$transaction(async (tx) => {
        const created = [];
        for (const item of data.items) {
          created.push(
            await tx.purchase.create({
              data: purchaseCreateData(
                writePlantId,
                session.user.id,
                data,
                item,
                headerGst,
                photos,
                approvalFields,
                backdated,
                day,
              ),
            }),
          );
        }
        return created;
      });

      await safeWriteAuditLog({
        entityType: "Purchase",
        entityId: purchases[0]!.id,
        field: "create",
        newValue: {
          vendorName: data.vendorName,
          billNumber: data.billNumber ?? null,
          shift: data.shift,
          itemCount: purchases.length,
          items: purchases.map((p) => p.itemDescription),
          invoiceValue: purchases.reduce(
            (sum, p) => sum + Number(p.invoiceValue),
            0,
          ),
        },
        actorId: session.user.id,
        plantId,
        isBackdated: backdated,
      });

      await safeRefreshDailyStatus(plantId, day, data.shift, session.user.id);
      await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

      return NextResponse.json({ purchases }, { status: 201 });
    }

    const parsed = purchaseSingleSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const data = parsed.data;
    const backdated = isBackdated(data.date);
    const day = parseDateOnly(data.date);
    const photos = normalizeBillPhotoUrls(data.billPhotoUrls, data.billPhotoUrl);
    const approval = entryApprovalCreateData(session.user.globalRole, data.date);
    const approvalFields = {
      ...approval,
      ...(approval.approvedByHead ? { approvedByHeadId: session.user.id } : {}),
    };

    const purchase = await prisma.purchase.create({
      data: purchaseCreateData(
        writePlantId,
        session.user.id,
        data,
        {
          itemDescription: data.itemDescription,
          unit: data.unit,
          quantity: data.quantity,
          rate: data.rate,
          gstPercent: data.gstPercent,
          debitQuantity: data.debitQuantity ?? 0,
          openingReading: data.openingReading,
          closingReading: data.closingReading,
        },
        data.gstPercent,
        photos,
        approvalFields,
        backdated,
        day,
      ),
    });

    await safeWriteAuditLog({
      entityType: "Purchase",
      entityId: purchase.id,
      field: "create",
      newValue: {
        vendorName: purchase.vendorName,
        billNumber: purchase.billNumber,
        itemDescription: purchase.itemDescription,
        invoiceValue: Number(purchase.invoiceValue),
      },
      actorId: session.user.id,
      plantId,
      isBackdated: backdated,
    });

    await safeRefreshDailyStatus(plantId, day, data.shift, session.user.id);
    await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save purchase entry";
    console.error("purchases POST failed", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
