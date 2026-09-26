import { NextRequest, NextResponse } from "next/server";
import {
  requireCanEnter,
  requirePlantAccess,
  requireSession,
  round2,
  zodErrorResponse,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
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
import { preferFullerInvoice } from "@/lib/pnl/excel-import/dedupe";
import { findMatchingSale } from "./find-matching-sale";
import { saleCreateData } from "./sale-create-data";
import { saleBatchSchema, saleSingleSchema, type RouteContext } from "./sale-schemas";

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

  if (isBatch) {
    const parsed = saleBatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const data = parsed.data;
    const backdated = isBackdated(data.date);
    const day = parseDateOnly(data.date);
    const photos = normalizeBillPhotoUrls(
      data.billPhotoUrls,
      data.billPhotoUrl,
    );
    const approval = entryApprovalCreateData(session.user.globalRole, data.date);
    const approvalFields = {
      ...approval,
      ...(approval.approvedByHead
        ? { approvedByHeadId: session.user.id }
        : {}),
    };

    const plantIds = await resolveReportPlantIds(plantId);

    const sales = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const item of data.items) {
        const salesValue = round2(item.quantity * item.rate);
        const existing = await findMatchingSale({
          plantIds,
          date: day,
          billNumber: data.billNumber,
          quantity: item.quantity,
          rate: item.rate,
        });
        if (existing) {
          const nextBill = preferFullerInvoice(
            existing.billNumber,
            data.billNumber,
          );
          if (nextBill && nextBill !== (existing.billNumber ?? "").trim()) {
            created.push(
              await tx.sale.update({
                where: { id: existing.id },
                data: { billNumber: nextBill },
              }),
            );
          } else {
            created.push(
              await tx.sale.findUniqueOrThrow({ where: { id: existing.id } }),
            );
          }
          continue;
        }
        created.push(
          await tx.sale.create({
            data: saleCreateData({
              writePlantId,
              day,
              shift: data.shift,
              type: data.type,
              typeOther: data.typeOther,
              customerName: data.customerName,
              billNumber: data.billNumber,
              billDate: data.billDate,
              notes: data.notes,
              itemDescription: item.itemDescription,
              unit: item.unit,
              quantity: item.quantity,
              rate: item.rate,
              salesValue,
              inMeter: item.inMeter,
              qtyMtr: item.qtyMtr,
              meterUnit: item.meterUnit,
              photos,
              enteredById: session.user.id,
              backdated,
              approvalFields,
            }),
          }),
        );
      }
      return created;
    });

    await writeAuditLog({
      entityType: "Sale",
      entityId: sales[0].id,
      field: "create",
      newValue: {
        customerName: data.customerName,
        billNumber: data.billNumber ?? null,
        shift: data.shift,
        itemCount: sales.length,
        items: sales.map((s) => s.itemDescription),
        salesValue: sales.reduce((sum, s) => sum + Number(s.salesValue), 0),
      },
      actorId: session.user.id,
      plantId,
      isBackdated: backdated,
    });

    await safeRefreshDailyStatus(plantId, day, data.shift, session.user.id);
    await maybeAwardCreditScore(session.user.id, plantId, day, data.shift);

    return NextResponse.json({ sales }, { status: 201 });
  }

  const parsed = saleSingleSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const data = parsed.data;
  const salesValue = round2(data.quantity * data.rate);
  const backdated = isBackdated(data.date);
  const photos = normalizeBillPhotoUrls(data.billPhotoUrls, data.billPhotoUrl);
  const day = parseDateOnly(data.date);
  const plantIds = await resolveReportPlantIds(plantId);

  const existing = await findMatchingSale({
    plantIds,
    date: day,
    billNumber: data.billNumber,
    quantity: data.quantity,
    rate: data.rate,
  });
  if (existing) {
    const nextBill = preferFullerInvoice(existing.billNumber, data.billNumber);
    const sale =
      nextBill && nextBill !== (existing.billNumber ?? "").trim()
        ? await prisma.sale.update({
            where: { id: existing.id },
            data: { billNumber: nextBill },
          })
        : await prisma.sale.findUniqueOrThrow({ where: { id: existing.id } });
    return NextResponse.json({ sale, merged: true });
  }

  const approval = entryApprovalCreateData(session.user.globalRole, data.date);
  const approvalFields = {
    ...approval,
    ...(approval.approvedByHead ? { approvedByHeadId: session.user.id } : {}),
  };

  const sale = await prisma.sale.create({
    data: saleCreateData({
      writePlantId,
      day,
      shift: data.shift,
      type: data.type,
      typeOther: data.typeOther,
      customerName: data.customerName,
      billNumber: data.billNumber,
      billDate: data.billDate,
      notes: data.notes,
      itemDescription: data.itemDescription,
      unit: data.unit,
      quantity: data.quantity,
      rate: data.rate,
      salesValue,
      inMeter: data.inMeter,
      qtyMtr: data.qtyMtr,
      meterUnit: data.meterUnit,
      photos,
      enteredById: session.user.id,
      backdated,
      approvalFields,
    }),
  });

  await writeAuditLog({
    entityType: "Sale",
    entityId: sale.id,
    field: "create",
    newValue: sale,
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

  return NextResponse.json({ sale }, { status: 201 });
}
