import { ManpowerShift, PurchaseType } from "@prisma/client";
import { z } from "zod";
import { round2 } from "@/lib/api";
import { parseDateOnly } from "@/lib/dates";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";
import type { purchaseItemSchema } from "./purchase-schemas";

export function lineTotals(quantity: number, rate: number, gstPercent: number, debitQuantity = 0) {
  const basicValue = round2((quantity - debitQuantity) * rate);
  const gstAmount = round2(basicValue * (gstPercent / 100));
  const invoiceValue = round2(basicValue + gstAmount);
  return { basicValue, gstAmount, invoiceValue, gstPercent };
}

export function purchaseCreateData(
  plantId: string,
  enteredById: string,
  header: {
    shift: ManpowerShift;
    type: PurchaseType;
    typeOther?: string | null;
    vendorName: string;
    billNumber?: string | null;
    billDate?: string | null;
    gstin?: string | null;
    booksDate?: string | null;
    notes?: string | null;
  },
  item: z.infer<typeof purchaseItemSchema>,
  headerGst: number,
  photos: ReturnType<typeof normalizeBillPhotoUrls>,
  approvalFields: Record<string, unknown>,
  backdated: boolean,
  day: Date,
) {
  const gstPercent = item.gstPercent ?? headerGst;
  const debitQuantity = item.debitQuantity ?? 0;
  if (debitQuantity > item.quantity) {
    throw new Error("Debit quantity cannot exceed item quantity");
  }
  const { basicValue, gstAmount, invoiceValue } = lineTotals(
    item.quantity,
    item.rate,
    gstPercent,
    debitQuantity,
  );
  return {
    plantId,
    date: day,
    shift: header.shift,
    type: header.type,
    typeOther:
      header.type === PurchaseType.OTHERS
        ? header.typeOther?.trim() || null
        : null,
    vendorName: header.vendorName,
    billNumber: header.billNumber ?? null,
    billDate: header.billDate ? parseDateOnly(header.billDate) : null,
    gstin: header.gstin?.trim() || null,
    debitQuantity,
    openingReading: item.openingReading ?? null,
    closingReading: item.closingReading ?? null,
    booksDate: header.booksDate ? parseDateOnly(header.booksDate) : null,
    notes: header.notes?.trim() || null,
    itemDescription: item.itemDescription,
    unit: item.unit,
    quantity: item.quantity,
    rate: item.rate,
    basicValue,
    gstPercent,
    gstAmount,
    invoiceValue,
    billPhotoUrl: photos.billPhotoUrl,
    billPhotoUrls: photos.billPhotoUrls,
    enteredById,
    isBackdated: backdated,
    ...approvalFields,
  };
}
