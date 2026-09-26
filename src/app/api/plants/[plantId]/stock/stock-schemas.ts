import { ManpowerShift, StockCategory } from "@prisma/client";
import { z } from "zod";
import { dateOnlyRegex } from "@/lib/dates";

export type RouteContext = { params: Promise<{ plantId: string }> };

export const stockLineSchema = z.object({
  itemName: z.string().min(1),
  category: z.enum(StockCategory).default(StockCategory.RM),
  unit: z.string().min(1).default("kg"),
  quantity: z.coerce.number().nonnegative(),
  rate: z.coerce.number().nonnegative().optional(),
  value: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
});

export const stockBatchSchema = z.object({
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift).default(ManpowerShift.DAY),
  photoUrl: z.string().url().optional().nullable(),
  photoUrls: z.array(z.string().url()).max(20).optional(),
  entries: z.array(stockLineSchema).min(1),
});

export const stockSingleSchema = z.object({
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift).default(ManpowerShift.DAY),
  itemName: z.string().min(1),
  category: z.enum(StockCategory).default(StockCategory.RM),
  unit: z.string().min(1).default("kg"),
  quantity: z.coerce.number().nonnegative(),
  rate: z.coerce.number().nonnegative().optional(),
  value: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  photoUrls: z.array(z.string().url()).max(20).optional(),
});
