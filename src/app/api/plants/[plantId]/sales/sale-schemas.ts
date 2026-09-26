import { ManpowerShift, SaleType } from "@prisma/client";
import { z } from "zod";
import { dateOnlyRegex } from "@/lib/dates";

export type RouteContext = { params: Promise<{ plantId: string }> };

export const saleHeaderFields = {
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift).default(ManpowerShift.DAY),
  type: z.enum(SaleType),
  typeOther: z.string().optional().nullable(),
  customerName: z.string().min(1),
  billNumber: z.string().optional().nullable(),
  billDate: z.string().regex(dateOnlyRegex).optional().nullable(),
  notes: z.string().optional().nullable(),
  billPhotoUrl: z.string().url().optional().nullable(),
  billPhotoUrls: z.array(z.string().url()).max(20).optional(),
};

export const saleItemSchema = z.object({
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative().optional().default(0),
  inMeter: z.coerce.number().nonnegative().optional().nullable(),
  qtyMtr: z.coerce.number().nonnegative().optional().nullable(),
  meterUnit: z.string().optional().nullable(),
});

export const saleSingleSchema = z.object({
  ...saleHeaderFields,
  itemDescription: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative().optional().default(0),
  inMeter: z.coerce.number().nonnegative().optional().nullable(),
  qtyMtr: z.coerce.number().nonnegative().optional().nullable(),
  meterUnit: z.string().optional().nullable(),
});

export const saleBatchSchema = z.object({
  ...saleHeaderFields,
  items: z.array(saleItemSchema).min(1),
});
