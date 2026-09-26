import { ManpowerShift, PurchaseType } from "@prisma/client";
import { z } from "zod";
import { dateOnlyRegex } from "@/lib/dates";

export type RouteContext = { params: Promise<{ plantId: string }> };

export const purchaseHeaderFields = {
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift).default(ManpowerShift.DAY),
  type: z.enum(PurchaseType),
  typeOther: z.string().optional().nullable(),
  vendorName: z.string().min(1),
  billNumber: z.string().optional().nullable(),
  billDate: z.string().regex(dateOnlyRegex).optional().nullable(),
  gstin: z.string().optional().nullable(),
  booksDate: z.string().regex(dateOnlyRegex).optional().nullable(),
  notes: z.string().optional().nullable(),
  billPhotoUrl: z.string().url().optional().nullable(),
  billPhotoUrls: z.array(z.string().url()).max(20).optional(),
};

export const purchaseItemSchema = z.object({
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative().optional().default(0),
  gstPercent: z.coerce.number().min(0).optional(),
  debitQuantity: z.coerce.number().nonnegative().optional().default(0),
  openingReading: z.coerce.number().nonnegative().optional().nullable(),
  closingReading: z.coerce.number().nonnegative().optional().nullable(),
});

export const purchaseSingleSchema = z.object({
  ...purchaseHeaderFields,
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative().optional().default(0),
  gstPercent: z.coerce.number().min(0).default(0),
  debitQuantity: z.coerce.number().nonnegative().optional().default(0),
  openingReading: z.coerce.number().nonnegative().optional().nullable(),
  closingReading: z.coerce.number().nonnegative().optional().nullable(),
});

export const purchaseBatchSchema = z.object({
  ...purchaseHeaderFields,
  gstPercent: z.coerce.number().min(0).optional(),
  items: z.array(purchaseItemSchema).min(1),
});
